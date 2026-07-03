import { createClient } from '@supabase/supabase-js';
import { prisma } from '@truthsentry/prisma';

const ORPHAN_THRESHOLD_MS = 60 * 60 * 1_000;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_CHAT_UPLOADS ?? 'chat-uploads';

function getSupabaseAdmin() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase credentials');
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function cleanupOrphans(): Promise<{ checked: number; deleted: number }> {
    const supabase = getSupabaseAdmin();
    const cutoff = new Date(Date.now() - ORPHAN_THRESHOLD_MS);
    let checked = 0;
    let deleted = 0;

    const { data: claimFolders, error: listError } = await supabase.storage
        .from(BUCKET)
        .list('claims', { limit: 500 });
    if (listError || !claimFolders) return { checked, deleted };

    for (const folder of claimFolders) {
        const { data: files } = await supabase.storage
            .from(BUCKET)
            .list(`claims/${folder.name}`, { limit: 200 });
        if (!files) continue;

        for (const file of files) {
            checked++;
            const timestampStr = file.name.split('-')[0];
            const uploadTime = timestampStr ? Number(timestampStr) : 0;
            if (!uploadTime || uploadTime > cutoff.getTime()) continue;

            const filePath = `claims/${folder.name}/${file.name}`;

            const referenced = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
                `SELECT COUNT(*) as count FROM "ClaimMessage" WHERE attachments::text LIKE $1`,
                `%${filePath}%`,
            );

            const refCount = Number(referenced[0]?.count ?? 0);
            if (refCount === 0) {
                const { error: delError } = await supabase.storage.from(BUCKET).remove([filePath]);
                if (!delError) deleted++;
            }
        }
    }

    return { checked, deleted };
}
