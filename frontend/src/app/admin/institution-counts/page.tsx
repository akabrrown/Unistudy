import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

export default async function InstitutionCountsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const supabase = await createClient();
  const pageSize = 20;
  const page = Number(searchParams.page) || 1;
  const rawType = typeof searchParams.type === 'string' ? searchParams.type : '';
  const typeFilter = rawType.toLowerCase();
  console.debug('typeFilter:', typeFilter);
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let query = supabase
    .from('institutions')
    .select(`
      id,
      name,
      abbreviation,
      type,
      institution_student_counts (student_count)
    `, { count: 'exact' })
    .order('name');

  if (typeFilter) {
    query = query.eq('type', typeFilter);
  }

  query = query.range(start, end);

  const { data, error, count } = await query;

  if (error) {
    console.error('Failed to fetch institution counts:', error);
    console.debug('typeFilter value:', typeFilter);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Institution Student Counts</h1>
        <p className="text-red-500">Error loading data.</p>
        <Link href="/admin" className="text-blue-600 underline mt-4 block">
          Back to Admin Home
        </Link>
      </div>
    );
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 1;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Institution Student Counts</h1>

      {/* Filter Form */}
        <form method="GET" className="mb-4 flex items-center gap-2">
          <label htmlFor="type" className="font-medium">Type:</label>
          <select name="type" id="type" defaultValue={typeFilter} className="border rounded px-2 py-1">
            <option value="">All</option>
            <option value="university">University</option>
            <option value="college">College</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <button type="submit" className="bg-primary text-white px-3 py-1 rounded">Filter</button>
        </form>

      <table className="min-w-full bg-card border border-border rounded-lg overflow-hidden">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-left font-medium">Abbreviation</th>
            <th className="px-4 py-2 text-left font-medium">Type</th>
            <th className="px-4 py-2 text-left font-medium">Student Count</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((inst) => (
            <tr key={inst.id} className="border-t border-border">
              <td className="px-4 py-2">{inst.name}</td>
              <td className="px-4 py-2">{inst.abbreviation || '—'}</td>
              <td className="px-4 py-2">{inst.type || '—'}</td>
              <td className="px-4 py-2 text-right">
                {inst.institution_student_counts?.[0]?.student_count ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="mt-4 flex justify-between items-center">
        <Link
          href={`/admin/institution-counts?${new URLSearchParams({
            page: (page - 1).toString(),
            type: typeFilter,
          }).toString()}`}
          className={page <= 1 ? 'text-gray-400 pointer-events-none' : 'text-primary hover:underline'}
        >
          ← Previous
        </Link>
        <span>Page {page} of {totalPages}</span>
        <Link
          href={`/admin/institution-counts?${new URLSearchParams({
            page: (page + 1).toString(),
            type: typeFilter,
          }).toString()}`}
          className={page >= totalPages ? 'text-gray-400 pointer-events-none' : 'text-primary hover:underline'}
        >
          Next →
        </Link>
      </div>

      <div className="mt-6">
        <Link href="/admin" className="text-blue-600 hover:underline">
          ← Back to Admin Home
        </Link>
      </div>
    </div>
  );
}
