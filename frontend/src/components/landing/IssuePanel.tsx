import { useState } from 'react';
import { ISSUE_PERKS, SCHEMA_SNIPPET } from './constants';
import { CheckIcon } from './landingIcons';

export function IssuePanel() {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(SCHEMA_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="section">
      <div className="wrap split">
        <div className="reveal">
          <span className="eyebrow">Clear, actionable</span>
          <h2 className="sec-h">
            Issues with fixes,
            <br />
            not just flags
          </h2>
          <p className="sub" style={{ marginLeft: 0 }}>
            Every finding ships with priority, context, numbered steps, and paste-ready code.
          </p>
          <div className="checklist">
            {ISSUE_PERKS.map((item) => (
              <div key={item} className="cl">
                <span className="ck">
                  <CheckIcon size={14} />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="issue-mock reveal">
          <div className="mock-dots">
            <span />
            <span />
            <span />
          </div>
          <div className="badges">
            <span className="bdg hi">High priority</span>
            <span className="bdg cat">Schema Markup</span>
          </div>
          <h4>Missing schema markup</h4>
          <p className="ex">
            AI engines use JSON-LD to parse your brand, services, and content. Without it, you&apos;re invisible in rich results and AI answers.
          </p>
          <div className="codehead">Add this in your &lt;head&gt;:</div>
          <pre className="code">
            <code>
              {'<script type="application/ld+json">\n'}
              {'{\n'}
              {'  '}<span className="k">&quot;@context&quot;</span>: <span className="s">&quot;https://schema.org&quot;</span>,{'\n'}
              {'  '}<span className="k">&quot;@type&quot;</span>: <span className="s">&quot;Organization&quot;</span>,{'\n'}
              {'  '}<span className="k">&quot;name&quot;</span>: <span className="s">&quot;Your Brand&quot;</span>,{'\n'}
              {'  '}<span className="k">&quot;url&quot;</span>: <span className="s">&quot;https://yoursite.com&quot;</span>,{'\n'}
              {'  '}<span className="k">&quot;logo&quot;</span>: <span className="s">&quot;https://yoursite.com/logo.png&quot;</span>{'\n'}
              {'}\n'}
              {'</script>'}
            </code>
          </pre>
          <div className="mock-btns">
            <button type="button" className={`mbtn copy${copied ? ' done' : ''}`} onClick={copyCode}>
              {copied ? 'Copied ✓' : 'Copy code'}
            </button>
            <button type="button" className="mbtn mark">
              Mark as fixed
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
