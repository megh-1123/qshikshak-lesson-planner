import { useState } from 'react';
import { CheckCircle2, Info, Undo2 } from 'lucide-react';
import Card from '@/components/common/Card';

const ROLE_TAG = { hod: 'HOD', principal: 'Principal' };

/** Review thread + (for HOD / principal) approve / send back */
export default function ReviewPanel({ reviews = [], canReview, onReview, busy, reviewerRole }) {
  const [comment, setComment] = useState('');
  return (
    <Card title="Review">
      <div className="thread">
        {reviews.length === 0 && <p className="faint">No comments yet.</p>}
        {reviews.map((r) => (
          <div key={r.id} className={`msg ${r.action}`}>
            <div className="row-between">
              <span className="strong small">
                {r.byName}
                {ROLE_TAG[r.byRole] && <span className="faint"> · {ROLE_TAG[r.byRole]}</span>}
              </span>
              <span className="faint">
                {new Date(r.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            <div className="small" style={{ marginTop: 4 }}>
              {r.action === 'approved' ? 'Approved' : 'Sent back'}
              {r.comment ? ` – ${r.comment}` : ''}
            </div>
          </div>
        ))}
      </div>
      {canReview && (
        <div className="stack" style={{ marginTop: 16 }}>
          {reviewerRole === 'principal' && (
            <div className="review-note">
              <Info size={16} />
              <span>You are reviewing as Principal, in place of the HOD. The HOD will be informed.</span>
            </div>
          )}
          <label className="field-label" htmlFor="rv-comment">
            Comment
          </label>
          <textarea
            id="rv-comment"
            className="textarea"
            placeholder="Required when sending back, e.g. Add a lab activity for Pressure"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn danger" disabled={busy} onClick={() => onReview('returned', comment)}>
              <Undo2 size={15} /> Send back
            </button>
            <button className="btn success" disabled={busy} onClick={() => onReview('approved', comment)}>
              <CheckCircle2 size={15} /> Approve
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}