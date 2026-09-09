import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AccountIcon from '../components/AccountIcon.jsx';

export default function Profile() {
  const { user, updateUserProfile, changePasswordWithCurrent, sendOtpToEmail, changePasswordDirect, logout } = useAuth();
  const nav = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState('current');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [otp, setOtp] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpMsg, setOtpMsg] = useState('');
  const [pwStage, setPwStage] = useState('verifyOtp');

  const resetPwForm = () => {
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setOtp(''); setOtpValue(''); setOtpSent(false);
    setOtpMsg(''); setPwStage('verifyOtp');
  };

  if (!user) { nav('/login', { replace: true, state: { from: '/profile' } }); return null; }

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 2500); };

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await updateUserProfile({ name: name.trim(), phone: phone.trim(), address: address.trim() }); flash("Profile updated."); }
    catch (ex) { flash(ex.message); } finally { setSaving(false); }
  };

  const handleSendOtp = async () => {
    setOtpMsg('Sending OTP...'); setOtp(''); setOtpValue(''); setOtpSent(false); setPwStage('verifyOtp');
    try {
      const otpVal = await sendOtpToEmail(user.email);
      setOtpValue(otpVal); setOtpSent(true);
      setOtpMsg('OTP sent to ' + user.email + '. (Demo code: ' + otpVal + ')');
    } catch (ex) { setOtpMsg(ex.message); }
  };

  const handleVerifyOtp = () => {
    if (otp === otpValue && otp.length === 6) { setPwStage("newPassword"); setOtpMsg("OTP verified. Enter your new password."); }
    else { setOtpMsg("Invalid OTP. Please try again."); }
  };

  const submitCurrentPw = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) return setOtpMsg('Passwords do not match.');
    if (newPw.length < 6) return setOtpMsg('Password must be at least 6 characters.');
    try {
      await changePasswordWithCurrent(currentPw, newPw);
      flash('Password changed!'); setModalOpen(false); resetPwForm();
    } catch (ex) { setOtpMsg(ex.message); }
  };

  const submitOtpPw = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) return setOtpMsg('Passwords do not match.');
    if (newPw.length < 6) return setOtpMsg('Password must be at least 6 characters.');
    try {
      await changePasswordDirect(newPw);
      flash('Password changed!'); setModalOpen(false); resetPwForm();
    } catch (ex) { setOtpMsg(ex.message); }
  };

  const closeModal = () => { setModalOpen(false); resetPwForm(); };

  return (
    <main className="page profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar"><AccountIcon size={48} /></div>
          <div className="profile-head">
            <h3 className="profile-name">{user?.name || "My Account"}</h3>
            <p>{user?.email}</p>
          </div>
        </div>

        <form onSubmit={saveProfile} className="form">
          <h2>Personal details</h2>
          <label>Name *
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          </label>
          <label>Phone
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
          </label>
          <label>Address
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="Street, city, postcode..." />
          </label>
          {msg && <p className="ok">{msg}</p>}
          <div className="flex-row-m">
            <button type="submit" className="btn btn-gold">Save changes</button>
          </div>
        </form>

        <div className="profile-pw-row">
          <button className="btn btn-dark btn-block" onClick={() => setModalOpen(true)}>Change password</button>
        </div>

        {modalOpen && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h2>Change password</h2>
                <button className="modal-close" onClick={closeModal}>x</button>
              </div>

              <div className="profile-tabs">
                <button className="profile-tab" onClick={() => setTab("current")}>Verify current password</button>
                <button className="profile-tab" onClick={() => setTab("otp")}>Send OTP to email</button>
              </div>

              {tab === 'current' && (
                <form onSubmit={submitCurrentPw} className="form">
                  <label>Current password
                    <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
                  </label>
                  <label>New password
                    <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6} />
                  </label>
                  <label>Confirm new password
                    <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required minLength={6} />
                  </label>
                  {otpMsg && <p className="error">{otpMsg}</p>}
                  <div className="flex-row-m">
                    <button type="submit" className="btn btn-gold">Change password</button>
                  </div>
                </form>
              )}

              {tab === 'otp' && (
                <form onSubmit={(e) => e.preventDefault()} className="form">
                  {!otpSent && (
                    <>
                      <p className="muted tiny">An OTP will be sent to <strong>{user.email}</strong>.</p>
                      <button className="btn btn-gold btn-block" type="button" onClick={handleSendOtp}>Send OTP</button>
                    </>
                  )}

                  {otpSent && (
                    <>
                      <label>Enter the 6-digit OTP
                        <input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="______" required />
                      </label>
                      {otpMsg && <p className={otpMsg.includes("OTP verified") ? "ok" : otpMsg.includes("Demo") ? "muted" : "error"}>{otpMsg}</p>}

                      {pwStage === 'verifyOtp' && (
                        <div className="flex-row-m">
                          <button className="btn btn-ghost btn-block" type="button" onClick={handleVerifyOtp}>Verify OTP</button>
                        </div>
                      )}

                      {pwStage === 'newPassword' && (
                        <>
                          <label>New password
                            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6} />
                          </label>
                          <label>Confirm new password
                            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required minLength={6} />
                          </label>
                          <button className="btn btn-gold btn-block" type="submit">Change password</button>
                        </>
                      )}
                    </>
                  )}
                </form>
              )}
            </div>
          </div>
        )}

        <div className="profile-logout">
          <button className="btn btn-dark" type="button" onClick={() => { logout(); nav("/"); }}>Log out</button>
        </div>
      </div>
    </main>
  );
}
