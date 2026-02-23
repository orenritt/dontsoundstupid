"use client";

import { useState, useEffect } from "react";

interface Peer {
  id: string;
  name: string;
  domain: string | null;
  description: string | null;
}

interface Review {
  id: string;
  confirmed: boolean;
  comment?: string;
}

interface AdditionalOrg {
  name: string;
  domain: string;
}

interface PeerReviewStepProps {
  onComplete: () => void;
  onBack?: () => void;
}

export function PeerReviewStep({ onComplete, onBack }: PeerReviewStepProps) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [additionalOrgs, setAdditionalOrgs] = useState<AdditionalOrg[]>([]);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDomain, setNewOrgDomain] = useState("");
  const [expandedComment, setExpandedComment] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding/peers")
      .then((res) => res.json())
      .then((data) => {
        setPeers(data.peers || []);
        setLoading(false);
      });
  }, []);

  const handleReview = (id: string, confirmed: boolean) => {
    setReviews((prev) => ({
      ...prev,
      [id]: { id, confirmed, comment: prev[id]?.comment },
    }));
    setExpandedComment(id);
  };

  const handleCommentChange = (id: string, comment: string) => {
    setComments((prev) => ({ ...prev, [id]: comment }));
    setReviews((prev) => ({
      ...prev,
      [id]: {
        id,
        confirmed: prev[id]?.confirmed ?? true,
        comment: comment || undefined,
      },
    }));
  };

  const addOrg = () => {
    if (!newOrgName.trim()) return;
    setAdditionalOrgs((prev) => [
      ...prev,
      { name: newOrgName.trim(), domain: newOrgDomain.trim() },
    ]);
    setNewOrgName("");
    setNewOrgDomain("");
    setShowAddOrg(false);
  };

  const allReviewed =
    peers.length > 0 &&
    peers.every((p) => reviews[p.id] !== undefined) &&
    !submitting;

  const handleSubmit = async () => {
    if (!allReviewed) return;
    setSubmitting(true);
    try {
      const reviewsArray = Object.values(reviews).map((r) => ({
        id: r.id,
        confirmed: r.confirmed,
        comment: r.comment,
      }));
      const res = await fetch("/api/onboarding/peers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews: reviewsArray, additionalOrgs }),
      });
      if (res.ok) onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="max-w-lg mx-auto w-full space-y-4">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-2 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 12L6 8l4-4" />
              </svg>
              Back
            </button>
          )}
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12">
      <div className="w-full max-w-lg mx-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 12L6 8l4-4" />
            </svg>
            Back
          </button>
        )}
        <div className="space-y-4">
          {peers.map((org) => (
            <div
              key={org.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {org.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {org.description || ""}
                  </p>
                  {org.domain && (
                    <p className="text-xs text-gray-400 mt-1">{org.domain}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleReview(org.id, true)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      reviews[org.id]?.confirmed === true
                        ? "bg-green-600 text-white"
                        : "border border-green-600 text-green-600 hover:bg-green-50"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleReview(org.id, false)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      reviews[org.id]?.confirmed === false
                        ? "bg-red-600 text-white"
                        : "border border-red-600 text-red-600 hover:bg-red-50"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
              {expandedComment === org.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <textarea
                    placeholder="Add a comment (optional)"
                    value={comments[org.id] || ""}
                    onChange={(e) =>
                      handleCommentChange(org.id, e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
                    rows={2}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowAddOrg(true)}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700 underline"
        >
          Add an org we missed
        </button>

        {showAddOrg && (
          <div className="mt-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 space-y-3">
            <input
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
            />
            <input
              placeholder="Domain (e.g. example.com)"
              value={newOrgDomain}
              onChange={(e) => setNewOrgDomain(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
            />
            <div className="flex gap-2">
              <button
                onClick={addOrg}
                disabled={!newOrgName.trim()}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddOrg(false);
                  setNewOrgName("");
                  setNewOrgDomain("");
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {additionalOrgs.length > 0 && (
          <div className="mt-4 space-y-2">
            {additionalOrgs.map((org, i) => (
              <div
                key={i}
                className="text-sm text-gray-600"
              >
                + {org.name} ({org.domain || "—"})
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!allReviewed}
          className="mt-8 w-full rounded-lg bg-gray-900 px-6 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
