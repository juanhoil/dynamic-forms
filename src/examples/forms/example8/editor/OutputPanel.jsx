import React from 'react';
import { buildMappingJSON } from '../utils/mapping';
import { hl } from '../ui/text';

export default function OutputPanel({ targets }) {
  const withMappings = targets.filter((t) => t.assignments && Object.keys(t.assignments).length);
  if (!withMappings.length) {
    return (
      <>
        <div className="xrm-out-section">
          <div className="xrm-out-eyebrow">x-responseMapping</div>
          <div className="xrm-out-code">—</div>
        </div>
        <div className="xrm-out-section">
          <div className="xrm-out-eyebrow">targetSchema</div>
          <div className="xrm-out-code">—</div>
        </div>
      </>
    );
  }
  const t = withMappings[0];
  const out = buildMappingJSON(t);
  return (
    <>
      <div className="xrm-out-section">
        <div className="xrm-out-eyebrow">x-responseMapping</div>
        <div
          className="xrm-out-code"
          dangerouslySetInnerHTML={{
            __html: hl(JSON.stringify(out['x-responseMapping'], null, 2)),
          }}
        />
      </div>
      <div className="xrm-out-section">
        <div className="xrm-out-eyebrow">targetSchema</div>
        <div
          className="xrm-out-code"
          dangerouslySetInnerHTML={{ __html: hl(JSON.stringify(out.targetSchema, null, 2)) }}
        />
      </div>
    </>
  );
}