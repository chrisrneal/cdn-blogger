import 'dotenv/config'; // Make sure to install dotenv if not present, or run with --env-file in newer node
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { createClient } from '@supabase/supabase-js';

// We re-create the client here to ensure we pick up env vars from the script execution context
// if not using the next.js built-in env loading.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const postsDirectory = path.join(process.cwd(), 'posts');

async function migrate() {
  console.log('Starting migration...');

  const fileNames = fs.readdirSync(postsDirectory);
  const posts = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const matterResult = matter(fileContents);
      const slug = fileName.replace(/\.md$/, '');

      return {
        slug,
        title: matterResult.data.title,
        date: new Date(matterResult.data.date).toISOString(), // Ensure ISO format for timestamp
        content: matterResult.content,
        created_by: 'migration_script',
      };
    });

  console.log(`Found ${posts.length} posts to migrate.`);

  for (const post of posts) {
    console.log(`Migrating: ${post.title} (${post.slug})`);

    // Check if exists to avoid duplicates (optional, but good practice)
    const { data: existing } = await supabase
        .from('posts')
        .select('id')
        .eq('slug', post.slug)
        .single();

    if (existing) {
        console.log(`  - Post already exists, updating...`);
        const { error } = await supabase
            .from('posts')
            .update(post)
            .eq('slug', post.slug);

        if (error) console.error(`  - Error updating ${post.slug}:`, error.message);
        else console.log(`  - Updated successfully.`);
    } else {
        const { error } = await supabase
            .from('posts')
            .insert(post);

        if (error) console.error(`  - Error inserting ${post.slug}:`, error.message);
        else console.log(`  - Inserted successfully.`);
    }
  }

  console.log('Migration complete.');
}

migrate();
