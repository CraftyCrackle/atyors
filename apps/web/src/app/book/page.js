'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import AuthGuard from '../../components/AuthGuard';
import BottomNav from '../../components/BottomNav';
import CheckoutForm from '../../components/CheckoutForm';
import { api } from '../../services/api';

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const STEPS = ['service', 'address', 'details', 'confirm', 'payment'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PUT_OUT_OPTIONS = ['5–7 PM (Afternoon)', '7–9 PM (Evening)', '9–11 PM (Night)'];
const BRING_IN_OPTIONS = ['12–4 PM (Afternoon)', '4–9 PM (Evening)'];

export default function BookPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [services, setServices] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [clientSecret, setClientSecret] = useState(null);
  const [createdBookingId, setCreatedBookingId] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);

  const [selected, setSelected] = useState({
    serviceType: null,
    bookingType: 'one-time',
    barrelCount: 1,
    trashDay: '',
    putOutTime: '',
    bringInTime: '',
    date: '',
    addressId: '',
  });

  useEffect(() => {
    async function load() {
      try {
        const [svcRes, addrRes, priceRes] = await Promise.all([
          api.get('/services/types/trash-recycling'),
          api.get('/addresses'),
          api.get('/services/pricing'),
        ]);
        setServices(svcRes.data.types);
        setAddresses(addrRes.data.addresses);
        setPricing(priceRes.data);
      } catch { }
      setLoading(false);
    }
    load();
  }, []);

  function next() { setStep((s) => Math.min(s + 1, STEPS.length - 1)); }
  function back() { step === 0 ? router.back() : setStep((s) => s - 1); }

  const perBarrel = pricing?.perBarrel ?? 1.50;
  const monthlyBase = pricing?.monthlyBase ?? 15;
  const monthlyBaseBoth = pricing?.monthlyBaseBoth ?? 25;
  const monthlyIncluded = pricing?.monthlyIncludedBarrels ?? 3;
  const extraBarrelMonthly = pricing?.extraBarrelMonthly ?? 2;

  function isBothSvc(svc) {
    return svc?.slug === 'both' || (svc?.name || '').toLowerCase().includes('both');
  }

  function isBoth() {
    return isBothSvc(selected.serviceType);
  }

  function oneTimePrice() {
    return isBoth() ? perBarrel * 2 * selected.barrelCount : perBarrel * selected.barrelCount;
  }

  function monthlyPrice() {
    const base = isBoth() ? monthlyBaseBoth : monthlyBase;
    const extra = Math.max(0, selected.barrelCount - monthlyIncluded);
    const extraCost = isBoth() ? extra * extraBarrelMonthly * 2 : extra * extraBarrelMonthly;
    return base + extraCost;
  }

  function currentPrice() {
    return selected.bookingType === 'subscription' ? monthlyPrice() : oneTimePrice();
  }

  function needsPutOut() {
    const name = selected.serviceType?.name?.toLowerCase() || '';
    return name.includes('put-out') || name.includes('both');
  }

  function needsBringIn() {
    const name = selected.serviceType?.name?.toLowerCase() || '';
    return name.includes('bring-in') || name.includes('both');
  }

  function selectAddress(addr) {
    setSelected((prev) => ({
      ...prev,
      addressId: addr._id,
      barrelCount: addr.barrelCount || prev.barrelCount || 1,
      trashDay: addr.trashDay || prev.trashDay || '',
    }));
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError('');
    try {
      let secret = null;
      let bookingId = null;

      if (selected.bookingType === 'subscription') {
        const dayOfWeek = new Date(selected.date + 'T12:00:00').getDay();
        const res = await api.post('/subscriptions', {
          addressId: selected.addressId,
          serviceTypeId: selected.serviceType._id,
          dayOfWeek,
          barrelCount: selected.barrelCount,
          putOutTime: selected.putOutTime,
          bringInTime: selected.bringInTime,
        });
        secret = res.data.clientSecret;
      } else {
        const res = await api.post('/bookings', {
          addressId: selected.addressId,
          serviceTypeId: selected.serviceType._id,
          scheduledDate: selected.date,
          barrelCount: selected.barrelCount,
          putOutTime: selected.putOutTime,
          bringInTime: selected.bringInTime,
          amount: oneTimePrice(),
        });
        const data = res.data;
        secret = data.clientSecret;
        bookingId = data.booking?._id || data.bookings?.[0]?._id || null;
      }

      if (!secret || secret === 'dev_mock_secret') {
        setStep(STEPS.indexOf('payment'));
        setClientSecret('mock');
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }

      setClientSecret(secret);
      setCreatedBookingId(bookingId);
      setStep(STEPS.indexOf('payment'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePaymentSuccess(pi) {
    setPaymentIntentId(pi.id);
    if (createdBookingId) {
      try {
        await api.post(`/bookings/${createdBookingId}/confirm-payment`, { paymentIntentId: pi.id });
      } catch {}
    }
    router.push('/dashboard');
  }

  const stripeOptions = useMemo(() => {
    if (!clientSecret || clientSecret === 'mock') return null;
    return { clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#1b70f5' } } };
  }, [clientSecret]);


  const selectedAddr = addresses.find((a) => a._id === selected.addressId);

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen-safe items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen-safe bg-white pb-24">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 pb-3 pt-sticky-safe">
          <button onClick={back} className="rounded-lg p-2 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1">
            <h1 className="font-semibold">Book a Service</h1>
            <p className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}</p>
          </div>
        </header>

        <div className="mx-4 mt-3 flex gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition ${i <= step ? 'bg-brand-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        {error && <div className="mx-4 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="mt-6 px-4">

          {/* Step 1: Service Selection */}
          {step === 0 && (
            <div>
              <h2 className="text-lg font-bold">Choose a Service</h2>
              <p className="mt-1 text-sm text-gray-500">Select what you need done with your trash barrels</p>
              <div className="mt-4 space-y-3">
                {services.map((svc) => (
                  <button key={svc._id} onClick={() => { setSelected({ ...selected, serviceType: svc }); next(); }}
                    className={`w-full rounded-xl border-2 p-4 text-left transition active:scale-[0.98] ${selected.serviceType?._id === svc._id ? 'border-brand-600 bg-brand-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{svc.name}</p>
                        <p className="mt-0.5 text-sm text-gray-500">{svc.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-brand-600">${isBothSvc(svc) ? (perBarrel * 2).toFixed(2) : perBarrel.toFixed(2)}/barrel</p>
                        <p className="text-xs text-gray-400">{isBothSvc(svc) ? '2 jobs created' : 'per service'}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Address Selection */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold">Service Address</h2>
              <p className="mt-1 text-sm text-gray-500">Where should we provide service? Your barrel details will be loaded automatically.</p>

              {addresses.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {addresses.map((addr) => (
                    <button key={addr._id} onClick={() => selectAddress(addr)}
                      className={`w-full rounded-xl border-2 px-4 py-3 text-left transition ${selected.addressId === addr._id ? 'border-brand-600 bg-brand-50' : 'border-gray-100'}`}>
                      <p className="font-medium">{addr.street}{addr.unit ? `, ${addr.unit}` : ''}</p>
                      <p className="text-sm text-gray-500">{addr.city}, {addr.state} {addr.zip}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                        {addr.barrelCount > 0 && <span>{addr.barrelCount} barrel{addr.barrelCount > 1 ? 's' : ''}</span>}
                        {addr.trashDay && <span>Trash day: {addr.trashDay}</span>}
                        {addr.barrelLocation && <span>Location: {addr.barrelLocation}</span>}
                      </div>
                      {addr.barrelPhotoUrl && (
                        <img src={addr.barrelPhotoUrl} alt="Barrel" className="mt-2 h-20 w-full rounded-lg object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <AddAddressForm onAdded={(addr) => { setAddresses([addr]); selectAddress(addr); }} />
              )}

              {addresses.length > 0 && (
                <div className="mt-4">
                  <AddAddressForm onAdded={(addr) => { setAddresses([...addresses, addr]); selectAddress(addr); }} />
                </div>
              )}

              {selected.addressId && (
                <CascadingDatePicker
                  key={selected.addressId}
                  trashDay={selected.trashDay}
                  selectedDate={selected.date}
                  onChange={(dateStr, dow) => setSelected((prev) => ({ ...prev, date: dateStr, trashDay: dow }))}
                />
              )}

              {selected.addressId && selected.date && (
                <button onClick={next}
                  className="mt-6 w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98]">
                  Continue
                </button>
              )}
            </div>
          )}

          {/* Step 3: Service Details (pre-filled from address) */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold">Service Details</h2>
              <p className="mt-1 text-sm text-gray-500">Review and adjust your barrel details</p>

              {selectedAddr && (
                <div className="mt-3 rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <p className="text-sm text-gray-600">{selectedAddr.street}{selectedAddr.unit ? `, ${selectedAddr.unit}` : ''}, {selectedAddr.city}</p>
                  </div>
                  {selectedAddr.barrelPhotoUrl && (
                    <img src={selectedAddr.barrelPhotoUrl} alt="Barrel location" className="mt-2 h-24 w-full rounded-lg object-cover" />
                  )}
                  {(selectedAddr.barrelPlacementInstructions || selectedAddr.barrelReturnInstructions || selectedAddr.barrelLocation) && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                      {selectedAddr.barrelLocation && <span>Location: {selectedAddr.barrelLocation}</span>}
                      {selectedAddr.barrelPlacementInstructions && <span>Curb: {selectedAddr.barrelPlacementInstructions}</span>}
                      {selectedAddr.barrelReturnInstructions && <span>Return: {selectedAddr.barrelReturnInstructions}</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Booking type */}
              <div className="mt-5">
                <label className="text-sm font-medium text-gray-700">Service Plan</label>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setSelected({ ...selected, bookingType: 'one-time' })}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition ${selected.bookingType === 'one-time' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-100 text-gray-500'}`}>
                    One-Time
                  </button>
                  <button onClick={() => setSelected({ ...selected, bookingType: 'subscription' })}
                    className={`relative flex-1 rounded-xl border-2 py-3 text-sm font-medium transition ${selected.bookingType === 'subscription' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-500'}`}>
                    <span className="absolute -top-2.5 right-2 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">SAVE</span>
                    Monthly
                  </button>
                </div>
              </div>

              {/* Barrel count */}
              <div className="mt-5">
                <label className="text-sm font-medium text-gray-700">Number of Barrels</label>
                <div className="mt-2 flex items-center gap-4">
                  <button onClick={() => setSelected({ ...selected, barrelCount: Math.max(1, selected.barrelCount - 1) })}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 text-lg font-bold text-gray-600 transition hover:border-brand-400 active:scale-95 disabled:opacity-30" disabled={selected.barrelCount <= 1}>
                    −
                  </button>
                  <span className="min-w-[3rem] text-center text-2xl font-bold">{selected.barrelCount}</span>
                  <button onClick={() => setSelected({ ...selected, barrelCount: selected.barrelCount + 1 })}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 text-lg font-bold text-gray-600 transition hover:border-brand-400 active:scale-95">
                    +
                  </button>
                </div>
              </div>

              {/* Price preview */}
              <div className="mt-4 rounded-xl bg-brand-50 p-4">
                {selected.bookingType === 'one-time' ? (
                  <div className="space-y-1">
                    {isBoth() ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Put-Out: {selected.barrelCount} barrel{selected.barrelCount > 1 ? 's' : ''} × ${perBarrel.toFixed(2)}</span>
                          <span className="font-medium">${(perBarrel * selected.barrelCount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Bring-In: {selected.barrelCount} barrel{selected.barrelCount > 1 ? 's' : ''} × ${perBarrel.toFixed(2)}</span>
                          <span className="font-medium">${(perBarrel * selected.barrelCount).toFixed(2)}</span>
                        </div>
                        <hr className="border-brand-200" />
                      </>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{selected.barrelCount} barrel{selected.barrelCount > 1 ? 's' : ''} × ${perBarrel.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold text-gray-700">Total</span>
                      <span className="text-xl font-bold text-brand-600">${oneTimePrice().toFixed(2)}</span>
                    </div>
                    {isBoth() && (
                      <p className="mt-1 text-xs text-brand-600">This will create 2 independent jobs</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Base ({monthlyIncluded} barrels included weekly)</span>
                      <span className="font-medium">${isBoth() ? monthlyBaseBoth : monthlyBase}/mo</span>
                    </div>
                    {selected.barrelCount > monthlyIncluded && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{selected.barrelCount - monthlyIncluded} extra barrel{selected.barrelCount - monthlyIncluded > 1 ? 's' : ''} × ${isBoth() ? (extraBarrelMonthly * 2) : extraBarrelMonthly}/mo</span>
                        <span className="font-medium">${((selected.barrelCount - monthlyIncluded) * (isBoth() ? extraBarrelMonthly * 2 : extraBarrelMonthly))}/mo</span>
                      </div>
                    )}
                    <hr className="border-brand-200" />
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold text-gray-700">Monthly total</span>
                      <span className="text-xl font-bold text-green-600">${monthlyPrice()}/mo</span>
                    </div>
                    {(() => {
                      const weeklyOneTime = oneTimePrice();
                      const monthlyOneTimeEquiv = weeklyOneTime * 4;
                      const savings = monthlyOneTimeEquiv - monthlyPrice();
                      if (savings > 0) return (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-2">
                          <svg className="h-4 w-4 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-semibold text-green-700">
                            You save ${savings.toFixed(2)}/mo vs. 4 one-time services (${monthlyOneTimeEquiv.toFixed(2)})
                          </span>
                        </div>
                      );
                      return null;
                    })()}
                    {isBoth() && (
                      <p className="mt-1 text-xs text-brand-600">Each week generates 2 independent jobs</p>
                    )}
                  </div>
                )}
              </div>

              {/* Selected date (read-only from previous step) */}
              <div className="mt-5">
                <label className="text-sm font-bold text-gray-900">Trash pickup day</label>
                <p className="mt-0.5 text-xs text-gray-500">What day should barrel(s) be placed on the curb?</p>
                {selected.date && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
                    <svg className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <p className="font-semibold text-brand-700">
                      {new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>

              {/* Put-out / Bring-in times */}
              {needsPutOut() && (
                <div className="mt-5">
                  <label className="text-sm font-medium text-gray-700">When should barrels be placed on the curb?</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {PUT_OUT_OPTIONS.map((opt) => (
                      <button key={opt} onClick={() => setSelected({ ...selected, putOutTime: opt })}
                        className={`rounded-lg border-2 px-3 py-2.5 text-sm transition ${selected.putOutTime === opt ? 'border-brand-600 bg-brand-50 text-brand-700 font-medium' : 'border-gray-100 text-gray-500'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {needsBringIn() && (
                <div className="mt-5">
                  <label className="text-sm font-medium text-gray-700">When should barrels be brought back in?</label>
                  {selected.date && (
                    <p className="mt-1 text-sm font-semibold text-brand-700">
                      Next Day [{(() => {
                        const d = new Date(selected.date + 'T12:00:00');
                        d.setDate(d.getDate() + 1);
                        return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                      })()}]
                    </p>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {BRING_IN_OPTIONS.map((opt) => (
                      <button key={opt} onClick={() => setSelected({ ...selected, bringInTime: opt })}
                        className={`rounded-lg border-2 px-3 py-2.5 text-sm transition ${selected.bringInTime === opt ? 'border-brand-600 bg-brand-50 text-brand-700 font-medium' : 'border-gray-100 text-gray-500'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={next} disabled={!selected.trashDay}
                className="mt-6 w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-40">
                Continue
              </button>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold">Confirm Booking</h2>
              <p className="mt-1 text-sm text-gray-500">Review your service details</p>

              {isBoth() && (
                <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700">
                  <strong>Note:</strong> This will create 2 independent jobs — one for Put-Out and one for Bring-In. Each can be accepted by any servicer separately.
                </div>
              )}

              <div className="mt-4 space-y-3 rounded-xl bg-gray-50 p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Service</span>
                  <span className="text-sm font-medium">{selected.serviceType?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Address</span>
                  <span className="text-sm font-medium text-right">{selectedAddr?.street}{selectedAddr?.unit ? `, ${selectedAddr.unit}` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Plan</span>
                  <span className="text-sm font-medium">{selected.bookingType === 'subscription' ? 'Monthly Subscription' : 'One-Time'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Barrels</span>
                  <span className="text-sm font-medium">{selected.barrelCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Trash Day</span>
                  <span className="text-sm font-medium">{selected.trashDay}</span>
                </div>
                {selected.putOutTime && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Put Out</span>
                    <span className="text-sm font-medium">{selected.putOutTime}</span>
                  </div>
                )}
                {selected.bringInTime && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Bring In</span>
                    <span className="text-sm font-medium">{selected.bringInTime}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Date</span>
                  <span className="text-sm font-medium">{new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                {selectedAddr?.barrelPhotoUrl && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Barrel photo (visible to servicer)</p>
                    <img src={selectedAddr.barrelPhotoUrl} alt="Barrel" className="h-24 w-full rounded-lg object-cover" />
                  </div>
                )}
                <hr className="border-gray-200" />
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-brand-600">
                    ${currentPrice().toFixed(2)}{selected.bookingType === 'subscription' ? '/mo' : ''}
                  </span>
                </div>
              </div>

              <button onClick={handleConfirm} disabled={submitting}
                className="mt-6 w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50">
                {submitting ? 'Processing...' : selected.bookingType === 'subscription' ? 'Start Subscription' : 'Proceed to Payment'}
              </button>
            </div>
          )}

          {/* Step 5: Payment */}
          {step === 4 && clientSecret && (
            <div>
              {clientSecret === 'mock' ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-gray-900">Booking Confirmed!</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    {selected.bookingType === 'subscription'
                      ? `Your subscription ($${monthlyPrice().toFixed(2)}/mo) is active.`
                      : `Your service ($${oneTimePrice().toFixed(2)}) has been booked.`}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">Redirecting to your dashboard...</p>
                  <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full animate-pulse rounded-full bg-brand-600" style={{ width: '100%' }} />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold">Complete Payment</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {selected.bookingType === 'subscription'
                      ? `Monthly subscription — $${monthlyPrice().toFixed(2)}/mo`
                      : `One-time payment — $${oneTimePrice().toFixed(2)}`}
                  </p>

                  <div className="mt-6">
                    {stripePromise && stripeOptions ? (
                      <Elements stripe={stripePromise} options={stripeOptions}>
                        <CheckoutForm
                          onSuccess={handlePaymentSuccess}
                          amount={selected.bookingType === 'subscription' ? monthlyPrice() : oneTimePrice()}
                          label={selected.bookingType === 'subscription' ? 'Subscribe' : 'Pay Now'}
                        />
                      </Elements>
                    ) : (
                      <div className="rounded-xl bg-yellow-50 p-4 text-center text-sm text-yellow-700">
                        Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
}

function CascadingDatePicker({ trashDay, selectedDate, onChange }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const today = new Date(currentYear, currentMonth, now.getDate());

  const dayMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };
  const targetDow = dayMap[trashDay];

  function getDaysForMonth(m) {
    if (targetDow == null) return [];
    const days = [];
    const d = new Date(currentYear, m, 1, 12, 0, 0);
    while (d.getDay() !== targetDow) d.setDate(d.getDate() + 1);
    while (d.getMonth() === m) {
      if (d >= today) days.push(new Date(d));
      d.setDate(d.getDate() + 7);
    }
    return days;
  }

  function firstMonthWithDates() {
    for (let m = currentMonth; m <= 11; m++) {
      if (getDaysForMonth(m).length > 0) return m;
    }
    return currentMonth;
  }

  const [month, setMonth] = useState(() => {
    if (selectedDate) return new Date(selectedDate + 'T12:00:00').getMonth();
    return firstMonthWithDates();
  });

  const availableDays = useMemo(() => getDaysForMonth(month), [month, trashDay]);

  const months = useMemo(() => {
    const list = [];
    for (let m = currentMonth; m <= 11; m++) list.push(m);
    return list;
  }, []);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function handleMonthChange(newMonth) {
    setMonth(newMonth);
    const days = getDaysForMonth(newMonth);
    if (days.length > 0) {
      onChange(toDateStr(days[0]), trashDay);
    } else {
      onChange('', trashDay);
    }
  }

  function handleDayChange(dateStr) {
    onChange(dateStr, trashDay);
  }

  useEffect(() => {
    if (!trashDay || targetDow == null) return;
    if (selectedDate) return;
    const startMonth = firstMonthWithDates();
    setMonth(startMonth);
    const days = getDaysForMonth(startMonth);
    if (days.length > 0) onChange(toDateStr(days[0]), trashDay);
  }, [trashDay]);

  if (!trashDay) return null;

  return (
    <div className="mt-5">
      <label className="text-sm font-bold text-gray-900">Service date</label>
      <p className="mt-0.5 text-xs text-gray-500">Pick the {trashDay} you&apos;d like service</p>
      <div className="mt-2 flex gap-2">
        <select
          value={month}
          onChange={(e) => handleMonthChange(Number(e.target.value))}
          className="flex-1 rounded-lg border border-gray-200 bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-700 focus:border-brand-500 focus:outline-none"
        >
          {months.map((m) => {
            const hasDates = getDaysForMonth(m).length > 0;
            return (
              <option key={m} value={m} disabled={!hasDates}>
                {monthNames[m]}{!hasDates ? ' (no dates)' : ''}
              </option>
            );
          })}
        </select>
        <select
          value={selectedDate || ''}
          onChange={(e) => handleDayChange(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-700 focus:border-brand-500 focus:outline-none"
        >
          {availableDays.length === 0 && <option value="">No dates</option>}
          {availableDays.map((d) => (
            <option key={toDateStr(d)} value={toDateStr(d)}>
              {d.toLocaleDateString('en-US', { weekday: 'short' })} {d.getDate()}
            </option>
          ))}
        </select>
        <div className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm font-medium text-gray-500">
          {currentYear}
        </div>
      </div>
    </div>
  );
}

function AddAddressForm({ onAdded }) {
  const [form, setForm] = useState({
    street: '', unit: '', city: '', state: '', zip: '',
    barrelCount: 1, barrelLocation: '', barrelNotes: '',
    barrelPlacementInstructions: '', barrelReturnInstructions: '', trashDay: '',
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [show, setShow] = useState(false);
  const update = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/addresses', {
        ...form,
        barrelCount: parseInt(form.barrelCount) || 1,
        lat: 42.3601, lng: -71.0589,
        formatted: `${form.street}, ${form.city}, ${form.state} ${form.zip}`,
        isDefault: true,
      });
      const addr = res.data.address;

      if (photo) {
        const fd = new FormData();
        fd.append('photo', photo);
        const token = localStorage.getItem('accessToken');
        const photoRes = await fetch(`/api/v1/addresses/${addr._id}/photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const photoData = await photoRes.json();
        if (photoData.success) addr.barrelPhotoUrl = photoData.data.photoUrl;
      }

      onAdded(addr);
    } catch { }
    setSubmitting(false);
  }

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 hover:border-brand-300 hover:text-brand-600">
        + Add New Address
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase">Address</p>
      <input type="text" placeholder="Street address" value={form.street} onChange={update('street')} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
      <input type="text" placeholder="Apt / Unit (optional)" value={form.unit} onChange={update('unit')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
      <div className="flex gap-2">
        <input type="text" placeholder="City" value={form.city} onChange={update('city')} required className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        <input type="text" placeholder="State" value={form.state} onChange={update('state')} required className="w-16 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        <input type="text" placeholder="ZIP" value={form.zip} onChange={update('zip')} required className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
      </div>

      <hr className="border-gray-100" />
      <p className="text-xs font-medium text-gray-500 uppercase">Barrel Details</p>

      <div>
        <label className="text-xs text-gray-500">Number of barrels at this address</label>
        <input type="number" min="1" value={form.barrelCount} onChange={(e) => setForm({ ...form, barrelCount: e.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
      </div>

      <input type="text" placeholder='Where are your barrels? (e.g. "Left side of garage")' value={form.barrelLocation} onChange={update('barrelLocation')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />

      <input type="text" placeholder='Where to place barrels on curb (e.g. "End of driveway")' value={form.barrelPlacementInstructions} onChange={update('barrelPlacementInstructions')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />

      <input type="text" placeholder='Where to return barrels (e.g. "Back by garage door")' value={form.barrelReturnInstructions} onChange={update('barrelReturnInstructions')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />

      <div>
        <label className="text-sm font-bold text-gray-900">Trash pickup day</label>
        <p className="mt-0.5 text-xs text-gray-500">What day should barrel(s) be placed on the curb?</p>
        <select value={form.trashDay} onChange={update('trashDay')} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
          <option value="">Select day</option>
          {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <textarea placeholder="Any extra notes for the servicer (optional)" value={form.barrelNotes} onChange={update('barrelNotes')} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none resize-none" />

      <div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {photo ? photo.name : 'Take or upload a photo of your barrels'}
          <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
        </label>
        {photoPreview && (
          <div className="mt-2 relative">
            <img src={photoPreview} alt="Barrel preview" className="h-32 w-full rounded-lg object-cover" />
            <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null); }} className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
      </div>

      <button type="submit" disabled={submitting} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {submitting ? 'Saving...' : 'Save Address'}
      </button>
    </form>
  );
}
