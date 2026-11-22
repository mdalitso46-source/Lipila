export function DemoSmsNotice() {
  return (
    <p className="demo-sms-note">
      Demo SMS: your code is shown here. Live SMS delivery arrives in Phase 2.
    </p>
  );
}

export function OtpEntry({
  sent,
  demoCode,
  code,
  onChange,
}: {
  sent: boolean;
  demoCode: string | null;
  code: string;
  onChange: (value: string) => void;
}) {
  if (!sent) return null;
  return (
    <>
      {demoCode ? (
        <div className="sms-preview" role="status" aria-label="Demo SMS preview">
          <div className="sms-preview-top">
            <span className="sms-preview-badge">Demo SMS</span>
            <span>Not a real message</span>
          </div>
          <div className="sms-bubble">
            <p>Lipila preview</p>
            <strong className="tnum">{demoCode}</strong>
            <p>This code is drawn on the screen. It was not sent by a mobile network.</p>
          </div>
          <p className="sms-preview-foot">Demo SMS: your code is shown here. Live SMS delivery arrives in Phase 2.</p>
        </div>
      ) : (
        <p className="note">We texted a 6-digit code. It expires in 10 minutes. This sign-in is for the testnet sandbox.</p>
      )}
      <label className="field">
        <span>One-time code</span>
        <input
          className="code-input tnum"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => onChange(event.target.value)}
          placeholder="6 digits"
        />
      </label>
    </>
  );
}
