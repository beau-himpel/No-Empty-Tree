import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { authErrorMessage, updatePassword, useAuth } from '../../lib/auth';
import { toast } from '../../lib/toast';
import { MIN_PASSWORD_LENGTH } from './AuthPanel';
import { FieldError, PasswordInput } from './PasswordInput';

export default function ResetPassword() {
  const navigate = useNavigate();
  const email = useAuth().user?.email ?? null;
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showError = password.length < MIN_PASSWORD_LENGTH && (touched || submitted);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (password.length < MIN_PASSWORD_LENGTH || saving) return;

    setSaving(true);
    setError(null);
    try {
      await updatePassword(password);
      toast.show('Password updated');
      navigate('/adopt-family', { viewTransition: true });
    } catch (updateError) {
      setError(authErrorMessage(updateError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md animate-fade-up">
      <h1 className="type-page-title">Choose a new password</h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-stone-500">
        You're signed in as <span className="font-medium text-stone-900">{email}</span>. Pick a new password for next
        time.
      </p>

      {error && (
        <div
          className="mt-6 flex items-start gap-3 rounded-xl bg-berry-50 p-3.5 text-sm font-medium text-berry-800 animate-fade-in"
          role="alert"
        >
          <i className="pi pi-exclamation-circle mt-0.5 text-berry-600" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} noValidate className="mt-8 space-y-6">
        <div>
          <label className="field-label" htmlFor="new-password">
            New password
          </label>
          <PasswordInput
            id="new-password"
            value={password}
            onChange={setPassword}
            onBlur={() => setTouched(true)}
            autoComplete="new-password"
            invalid={showError}
            describedBy="new-password-hint"
            showPassword={showPassword}
            onToggleShow={() => setShowPassword(!showPassword)}
          />
          {showError ? (
            <FieldError>Use at least {MIN_PASSWORD_LENGTH} characters</FieldError>
          ) : (
            <p className="field-hint" id="new-password-hint">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          )}
        </div>

        <button type="submit" className="btn-dark btn-lg w-full" disabled={saving}>
          {saving ? (
            <>
              <i className="pi pi-spin pi-spinner" aria-hidden="true" />
              Saving…
            </>
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </section>
  );
}
