import { Github, ExternalLink, GraduationCap } from 'lucide-react';
import { projectConfig } from '../config/projectConfig.js';

/**
 * About — compact project info, generated entirely from projectConfig.js
 * so students personalise one file and everything updates.
 */
export default function AboutPanel({ onClose }) {
  const isPlaceholder = projectConfig.author.name.includes('[');

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="About OSMOS" onClick={onClose}>
      <div className="overlay-card" onClick={(event) => event.stopPropagation()}>
        <header className="overlay-head">
          <div>
            <span className="overlay-kicker">About this project</span>
            <h2>
              {projectConfig.name} — {projectConfig.fullName}
            </h2>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="overlay-body">
          {isPlaceholder && (
            <div className="note is-warn">
              <span className="note-title">Before you submit</span>
              Open <span className="mono">src/config/projectConfig.js</span> and replace the{' '}
              <span className="mono">[YOUR NAME]</span>, college and GitHub placeholders — this panel, the README and
              the deployment path all read from that single file.
            </div>
          )}

          <div className="note">
            <span className="note-title">Objective</span>
            {projectConfig.objective}
          </div>

          <div className="stat-grid">
            <div className="stat">
              <div className="stat-label">Course</div>
              <div style={{ fontSize: 'var(--fs-11)', color: 'var(--text-hi)' }}>{projectConfig.course}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Version</div>
              <div className="mono" style={{ fontSize: 'var(--fs-11)', color: 'var(--text-hi)' }}>
                v{projectConfig.version}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">License</div>
              <div className="mono" style={{ fontSize: 'var(--fs-11)', color: 'var(--text-hi)' }}>
                {projectConfig.license}
              </div>
            </div>
          </div>

          <div>
            <div className="sub-heading">Developed by</div>
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-hi)' }}>
              <GraduationCap size={15} aria-hidden />
              <span>
                <b>{projectConfig.author.name}</b>
                <br />
                <span className="muted">
                  {projectConfig.author.program} · {projectConfig.author.institution}
                </span>
              </span>
            </p>
          </div>

          <div>
            <div className="sub-heading">Technology stack</div>
            <div className="req-list">
              {projectConfig.stack.map((item) => (
                <span key={item} className="req-chip">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="sub-heading">Concepts covered</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
              {projectConfig.concepts.map((concept) => (
                <li key={concept} className="muted">
                  {concept}
                </li>
              ))}
            </ul>
          </div>

          <div className="control-row">
            <a className="btn" href={projectConfig.repository} target="_blank" rel="noreferrer">
              <Github size={13} aria-hidden /> GitHub repository
            </a>
            <a className="btn" href={projectConfig.liveDemo} target="_blank" rel="noreferrer">
              <ExternalLink size={13} aria-hidden /> Live demo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
