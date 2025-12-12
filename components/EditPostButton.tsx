'use client';

import { useAuth } from '@/components/AuthContext';
import Link from 'next/link';

interface EditPostButtonProps {
    authorId: string;
    slug: string;
}

export default function EditPostButton({ authorId, slug }: EditPostButtonProps) {
    const { user } = useAuth();

    if (!user || user.id !== authorId) {
        return null;
    }

    return (
        <Link
            href={`/editor?slug=${slug}`}
            className="inline-block mt-4 px-3 py-1 text-sm font-medium border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
            Edit Post
        </Link>
    );
}
