'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/spinner';

const STATUSES = ['all', 'applied', 'processing', 'shortlisted', 'hold', 'rejected', 'invited'];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    const query = filter === 'all' ? '' : `&status=${filter}`;
    api(`/candidates?limit=100${query}`)
      .then((data) => setCandidates(data.items))
      .catch((err) => setError(err.message));
  }, [filter]);

  if (error) return <p className="py-10 text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Candidates</h1>
        <p className="text-sm text-zinc-500">Everyone who applied to your jobs.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === s
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {!candidates ? (
        <PageLoader label="Loading candidates..." />
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-zinc-400">
            No candidates {filter !== 'all' ? `with status "${filter}"` : 'yet'}.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto px-0 pb-0 pt-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-5 py-3 font-medium">Candidate</th>
                  <th className="px-5 py-3 font-medium">Job</th>
                  <th className="px-5 py-3 font-medium">Match score</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Applied</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c._id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-zinc-500">{c.email}</p>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{c.job_id?.title || '-'}</td>
                    <td className="px-5 py-3">
                      {c.match_score == null ? (
                        <span className="text-zinc-400">-</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className={`h-full ${
                                c.match_score >= 80
                                  ? 'bg-emerald-500'
                                  : c.match_score >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${c.match_score}%` }}
                            />
                          </div>
                          <span className="font-medium">{c.match_score}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-500">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
