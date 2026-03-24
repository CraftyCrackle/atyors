'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthGuard from '../../components/AuthGuard';
import BottomNav from '../../components/BottomNav';
import QuickAddAddress from '../../components/QuickAddAddress';
import { api } from '../../services/api';
import PhotoViewer from '../../components/PhotoViewer';

const STEPS = ['service', 'address', 'details', 'confirm'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PUT_OUT_TIME = '5–9 PM';
const BRING_IN_OPTIONS = [
  { value: 'Afternoon (12–4 PM)', label: 'Afternoon', time: '12–4 PM', hint: 'Best choice — trash is usually collected by morning' },
  { value: 'Evening (4–8 PM)', label: 'Evening', time: '4–8 PM', hint: 'For areas where pickup runs later in the day' },
];

export default function BookPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" /></div>}>
      <BookContent />
    </Suspense>
  );
}

function BookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [services, setServices] = useState([]);
  const [serviceGroups, setServiceGroups] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [hasCard, setHasCard] = useState(true);

  const [selected, setSelected] = useState({
    serviceType: null,
    bookingType: 'one-time',
    barrelCount: 1,
    trashDay: '',
    putOutTime: '',
    bringInTime: '',
    date: '',
    addressId: '',
    itemCount: 1,
    curbItemNotes: '',
    floors: 1,
    staircases: 0,
    frontEntrance: false,
    backEntrance: false,
  });
  const [curbItemPhotos, setCurbItemPhotos] = useState([]);
  const [curbItemPreviews, setCurbItemPreviews] = useState([]);
  const [cleaningPhotos, setCleaningPhotos] = useState([]);
  const [cleaningPreviews, setCleaningPreviews] = useState([]);
  const [dateFullyBooked, setDateFullyBooked] = useState(false);
  const [zipNotServed, setZipNotServed] = useState(false);
  const [zipWarnings, setZipWarnings] = useState({});
  const [locationWarnings, setLocationWarnings] = useState({});
  const [activeSubs, setActiveSubs] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedAddresses, setSelectedAddresses] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [svcRes, addrRes, priceRes, methodsRes, subsRes] = await Promise.all([
          api.get('/services/all-types'),
          api.get('/addresses'),
          api.get('/services/pricing'),
          api.get('/payments/methods').catch(() => ({ data: { methods: [] } })),
          api.get('/subscriptions').catch(() => ({ data: { subscriptions: [] } })),
        ]);
        const allTypes = (svcRes.data.groups || []).flatMap((g) => g.types || []);
        setServices(allTypes);
        setServiceGroups(svcRes.data.groups || []);
        setAddresses(addrRes.data.addresses);
        setPricing(priceRes.data);
        setHasCard((methodsRes.data.methods || []).length > 0);
        const activeSubs_ = (subsRes.data.subscriptions || []).filter((s) => s.status !== 'cancelled');
        setActiveSubs(activeSubs_);
        if (activeSubs_.length > 0 || searchParams.get('plan') === 'subscription') {
          setSelected((prev) => ({ ...prev, bookingType: 'subscription' }));
        }
      } catch { }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!selected.date) { setDateFullyBooked(false); return; }
    if (isEntranceCleaning()) {
      setDateFullyBooked(false);
      api.get(`/bookings/capacity/entrance-cleaning?date=${selected.date}`)
        .then((res) => { if (!res.data.available) setDateFullyBooked(true); })
        .catch(() => {});
      return;
    }
    const updates = {};
    if (selected.putOutTime && isTimeWindowPast(selected.putOutTime, false)) updates.putOutTime = '';
    if (selected.bringInTime && isTimeWindowPast(selected.bringInTime, true)) updates.bringInTime = '';
    if (Object.keys(updates).length) setSelected((prev) => ({ ...prev, ...updates }));
    setDateFullyBooked(false);
    const count = selectedAddresses.length || 1;
    api.get(`/bookings/capacity?date=${selected.date}&count=${count}`)
      .then((res) => { if (!res.data.available) setDateFullyBooked(true); })
      .catch(() => {});
  }, [selected.date, selectedAddresses.length, selected.serviceType]);

  useEffect(() => {
    if (needsPutOut() && !selected.putOutTime) {
      setSelected((prev) => ({ ...prev, putOutTime: PUT_OUT_TIME }));
    }
  }, [selected.serviceType]);

  function next() { setStep((s) => Math.min(s + 1, STEPS.length - 1)); }
  function back() { step === 0 ? router.back() : setStep((s) => s - 1); }

  const perBarrel = pricing?.perBarrel ?? 2.5;
  const perBarrelBoth = pricing?.perBarrelBoth ?? 4.0;
  const perBarrelBothLeg = pricing?.perBarrelBothLeg ?? 2.0;
  const monthlyBase = pricing?.monthlyBase ?? 30;
  const monthlyBaseBoth = pricing?.monthlyBaseBoth ?? 30;
  const monthlyIncluded = pricing?.monthlyIncludedBarrels ?? 3;
  const extraBarrelMonthly = pricing?.extraBarrelMonthly ?? 3;
  const curbItemPrice = pricing?.curbItemPrice ?? 2.0;
  const ecPerFloor = pricing?.entranceCleaningPerFloor ?? 15;
  const ecPerStair = pricing?.entranceCleaningPerStaircase ?? 8;
  const ecEntranceFee = pricing?.entranceCleaningEntranceFee ?? 15;
  const ecMonthlyPerFloor = pricing?.ecMonthlyPerFloor ?? 12;
  const ecMonthlyPerStair = pricing?.ecMonthlyPerStaircase ?? 6;
  const ecMonthlyEntranceFee = pricing?.ecMonthlyEntranceFee ?? 12;

  function isBothSvc(svc) {
    return svc?.slug === 'both';
  }

  function isCurbItemsSvc(svc) {
    return svc?.slug === 'curb-items';
  }

  function isEntranceCleaningSvc(svc) {
    return svc?.slug === 'entrance-cleaning';
  }

  function isBoth() {
    return isBothSvc(selected.serviceType);
  }

  function isCurbItems() {
    return isCurbItemsSvc(selected.serviceType);
  }

  function isEntranceCleaning() {
    return isEntranceCleaningSvc(selected.serviceType);
  }

  function entranceCleaningTotal() {
    const isMonthly = selected.bookingType === 'subscription';
    const pFloor = isMonthly ? ecMonthlyPerFloor : ecPerFloor;
    const pStair = isMonthly ? ecMonthlyPerStair : ecPerStair;
    const pEntrance = isMonthly ? ecMonthlyEntranceFee : ecEntranceFee;
    return (selected.floors * pFloor)
      + (selected.staircases * pStair)
      + (selected.frontEntrance ? pEntrance : 0)
      + (selected.backEntrance ? pEntrance : 0);
  }

  function handleCurbItemPhotos(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const allowed = 5 - curbItemPhotos.length;
    const toAdd = files.slice(0, allowed);
    setCurbItemPhotos((prev) => [...prev, ...toAdd]);
    setCurbItemPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  }

  function removeCurbItemPhoto(idx) {
    setCurbItemPhotos((prev) => prev.filter((_, i) => i !== idx));
    setCurbItemPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleCleaningPhotos(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const allowed = 5 - cleaningPhotos.length;
    const toAdd = files.slice(0, allowed);
    setCleaningPhotos((prev) => [...prev, ...toAdd]);
    setCleaningPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  }

  function removeCleaningPhoto(idx) {
    setCleaningPhotos((prev) => prev.filter((_, i) => i !== idx));
    setCleaningPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  function oneTimePrice() {
    return isBoth() ? perBarrelBoth * selected.barrelCount : perBarrel * selected.barrelCount;
  }

  function monthlyPrice() {
    const base = isBoth() ? monthlyBaseBoth : monthlyBase;
    const extra = Math.max(0, selected.barrelCount - monthlyIncluded);
    const extraCost = extra * extraBarrelMonthly;
    return base + extraCost;
  }

  function currentPrice() {
    if (isEntranceCleaning()) return entranceCleaningTotal();
    return selected.bookingType === 'subscription' ? monthlyPrice() : oneTimePrice();
  }

  function needsPutOut() {
    const slug = selected.serviceType?.slug || '';
    return slug === 'put-out' || slug === 'both';
  }

  function needsBringIn() {
    const slug = selected.serviceType?.slug || '';
    return slug === 'bring-in' || slug === 'both';
  }

  function isTimeWindowPast(opt, isBringIn) {
    if (!selected.date) return false;
    const base = new Date(selected.date + 'T12:00:00');
    if (isBringIn) base.setDate(base.getDate() + 1);
    const endHours = { '4–9 PM': 21, '5–7 AM': 7, '12–4 PM': 16, '5–7 PM': 19, '7–9 PM': 21, '9–11 PM': 23, '5–9 PM': 21, 'Afternoon': 16, 'Evening': 20 };
    let hour = 23;
    for (const [key, h] of Object.entries(endHours)) {
      if (opt.includes(key)) { hour = h; break; }
    }
    base.setHours(hour, 0, 0, 0);
    return new Date() > base;
  }

  function toggleAddress(addr) {
    setShowAddForm(false);
    const isSubscriptionMode = selected.bookingType === 'subscription';

    // In subscription mode, only single address allowed
    if (isSubscriptionMode) {
      const addrHasSub = activeSubs.some((s) => {
        const id = s.addressId?._id || s.addressId;
        const svcId = s.serviceTypeId?._id || s.serviceTypeId;
        return (id === addr._id || String(id) === String(addr._id))
          && (svcId === selected.serviceTypeId || String(svcId) === String(selected.serviceTypeId));
      });
      setSelectedAddresses([addr]);
      setSelected((prev) => ({
        ...prev,
        addressId: addr._id,
        barrelCount: addr.barrelCount || prev.barrelCount || 1,
        trashDay: addr.trashDay || prev.trashDay || 'Monday',
        bookingType: addrHasSub ? 'one-time' : prev.bookingType,
      }));
      setZipNotServed(false);
      checkZip(addr);
      return;
    }

    const alreadySelected = selectedAddresses.some((a) => a._id === addr._id);
    let next;
    if (alreadySelected) {
      next = selectedAddresses.filter((a) => a._id !== addr._id);
    } else {
      // Enforce same trash day as first selected
      const primary = selectedAddresses[0];
      if (primary && primary.trashDay && addr.trashDay && addr.trashDay !== primary.trashDay) return;
      next = [...selectedAddresses, addr];
    }

    setSelectedAddresses(next);
    const primary = next[0];
    if (primary) {
      const addrHasSub = activeSubs.some((s) => {
        const id = s.addressId?._id || s.addressId;
        const svcId = s.serviceTypeId?._id || s.serviceTypeId;
        return (id === primary._id || String(id) === String(primary._id))
          && (svcId === selected.serviceTypeId || String(svcId) === String(selected.serviceTypeId));
      });
      setSelected((prev) => ({
        ...prev,
        addressId: primary._id,
        barrelCount: primary.barrelCount || prev.barrelCount || 1,
        trashDay: primary.trashDay || prev.trashDay || 'Monday',
        bookingType: addrHasSub && next.length === 1 ? 'one-time' : prev.bookingType,
      }));
      setZipNotServed(false);
      checkZip(primary);
    } else {
      setSelected((prev) => ({ ...prev, addressId: '', trashDay: '' }));
    }
  }

  function checkZip(addr) {
    if (addr.zip) {
      api.get(`/services/check-zipcode?zip=${addr.zip}`)
        .then((res) => {
          setZipWarnings((prev) => ({ ...prev, [addr._id]: !res.data.served }));
          if (selectedAddresses.length <= 1) setZipNotServed(!res.data.served);
        })
        .catch(() => {});
    }
  }

  // Keep legacy for single-address compat
  function selectAddress(addr) { toggleAddress(addr); }

  async function handleConfirm() {
    setSubmitting(true);
    setError('');
    try {
      if (isEntranceCleaning() && selected.bookingType === 'subscription') {
        const dayOfWeek = new Date(selected.date + 'T12:00:00').getDay();
        const subRes = await api.post('/subscriptions', {
          addressId: selected.addressId,
          serviceTypeId: selected.serviceType._id,
          dayOfWeek,
          floors: selected.floors,
          staircases: selected.staircases,
          frontEntrance: selected.frontEntrance,
          backEntrance: selected.backEntrance,
        });

        const clientSecret = subRes.data?.clientSecret;
        if (clientSecret && clientSecret !== 'dev_mock_secret') {
          const { loadStripe } = await import('@stripe/stripe-js');
          const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
          if (stripe) {
            const { error } = await stripe.confirmCardPayment(clientSecret);
            if (error) throw new Error(error.message || 'Payment confirmation failed');
          }
        }
      } else if (isEntranceCleaning()) {
        let cleaningPhotoUrls = [];
        if (cleaningPhotos.length > 0) {
          const token = localStorage.getItem('accessToken');
          const fd = new FormData();
          cleaningPhotos.forEach((f) => fd.append('photos', f));
          const uploadRes = await fetch('/api/v1/bookings/upload-cleaning-photos', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });
          const uploadData = await uploadRes.json();
          if (!uploadData.success) throw new Error(uploadData.error?.message || 'Failed to upload photos');
          cleaningPhotoUrls = uploadData.data.photos;
        }

        await api.post('/bookings', {
          addressId: selected.addressId,
          serviceTypeId: selected.serviceType._id,
          scheduledDate: selected.date,
          floors: selected.floors,
          staircases: selected.staircases,
          frontEntrance: selected.frontEntrance,
          backEntrance: selected.backEntrance,
          cleaningAreaPhotos: cleaningPhotoUrls,
          amount: entranceCleaningTotal(),
        });
      } else if (isCurbItems()) {
        const token = localStorage.getItem('accessToken');
        let photoUrls = [];

        if (curbItemPhotos.length > 0) {
          const fd = new FormData();
          curbItemPhotos.forEach((f) => fd.append('photos', f));
          const uploadRes = await fetch('/api/v1/bookings/upload-curb-photos', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });
          const uploadData = await uploadRes.json();
          if (!uploadData.success) throw new Error(uploadData.error?.message || 'Failed to upload photos');
          photoUrls = uploadData.data.photos;
        }

        if (photoUrls.length === 0) throw new Error('At least one photo is required');

        const addressesToBook = selectedAddresses.length > 1 ? selectedAddresses : [{ _id: selected.addressId }];
        for (const addr of addressesToBook) {
          await api.post('/bookings', {
            addressId: addr._id,
            serviceTypeId: selected.serviceType._id,
            scheduledDate: selected.date,
            itemCount: selected.itemCount,
            curbItemNotes: selected.curbItemNotes,
            curbItemPhotos: photoUrls,
          });
        }
      } else if (selected.bookingType === 'subscription') {
        const dayOfWeek = new Date(selected.date + 'T12:00:00').getDay();
        const subRes = await api.post('/subscriptions', {
          addressId: selected.addressId,
          serviceTypeId: selected.serviceType._id,
          dayOfWeek,
          barrelCount: selected.barrelCount,
          putOutTime: selected.putOutTime,
          bringInTime: selected.bringInTime,
        });

        const clientSecret = subRes.data?.clientSecret;
        if (clientSecret && clientSecret !== 'dev_mock_secret') {
          const { loadStripe } = await import('@stripe/stripe-js');
          const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
          if (stripe) {
            const { error } = await stripe.confirmCardPayment(clientSecret);
            if (error) throw new Error(error.message || 'Payment confirmation failed');
          }
        }
      } else {
        const isBatch = selectedAddresses.length > 1;
        if (isBatch) {
          const barrelCounts = {};
          selectedAddresses.forEach((a) => { barrelCounts[a._id] = a.barrelCount || selected.barrelCount; });
          await api.post('/bookings/batch', {
            addresses: selectedAddresses.map((a) => a._id),
            serviceTypeId: selected.serviceType._id,
            scheduledDate: selected.date,
            bookingType: selected.bookingType,
            barrelCounts,
            putOutTime: selected.putOutTime,
            bringInTime: selected.bringInTime,
          });
        } else {
          await api.post('/bookings', {
            addressId: selected.addressId,
            serviceTypeId: selected.serviceType._id,
            scheduledDate: selected.date,
            barrelCount: selected.barrelCount,
            putOutTime: selected.putOutTime,
            bringInTime: selected.bringInTime,
            amount: oneTimePrice(),
          });
        }
      }

      setBookingConfirmed(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedAddr = addresses.find((a) => a._id === selected.addressId);
  const hasActiveSubForAddress = selected.addressId && selected.serviceTypeId && activeSubs.some((s) => {
    const subAddrId = s.addressId?._id || s.addressId;
    const subSvcId = s.serviceTypeId?._id || s.serviceTypeId;
    return (subAddrId === selected.addressId || String(subAddrId) === String(selected.addressId))
      && (subSvcId === selected.serviceTypeId || String(subSvcId) === String(selected.serviceTypeId));
  });
  const isBatchMode = selectedAddresses.length > 1;
  const anyZipNotServed = selectedAddresses.some((a) => zipWarnings[a._id]);

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
      <div id="main-content" className="min-h-screen-safe overflow-x-hidden bg-white pb-24">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 pb-3 pt-sticky-safe">
          <button onClick={back} aria-label="Go back" className="shrink-0 rounded-lg p-2 hover:bg-gray-100">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold">Book a Service</h1>
            <p className="text-xs text-gray-400" aria-live="polite">Step {step + 1} of {STEPS.length}</p>
          </div>
        </header>

        <div role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length} aria-label={`Step ${step + 1} of ${STEPS.length}`} className="mx-4 mt-3 flex gap-1">
          {STEPS.map((_, i) => (
            <div key={i} aria-hidden="true" className={`h-1 flex-1 rounded-full transition ${i <= step ? 'bg-brand-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        {error && (
          <div role="alert" aria-live="assertive" className="mx-4 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 px-4">

          {!hasCard && (
            <div className="mb-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900">Add a payment method first</h3>
                  <p className="mt-1 text-sm text-amber-700">You need a credit or debit card on file before you can book a service. You won't be charged until the job is done.</p>
                  <button onClick={() => router.push('/profile?section=payments')} className="mt-3 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 active:scale-[0.98]">
                    Go to Profile to Add Card
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Service Selection */}
          {step === 0 && (
            <div>
              <h2 className="text-lg font-bold">Choose a Service</h2>
              <p className="mt-1 text-sm text-gray-500">What do you need help with?</p>
              {serviceGroups.map((group) => (
                <div key={group.category._id} className="mt-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{group.category.name}</p>
                  <div className="space-y-3">
                    {group.types.map((svc) => (
                      <button key={svc._id} disabled={!hasCard} onClick={() => { setSelected({ ...selected, serviceType: svc }); next(); }}
                        className={`w-full rounded-xl border-2 p-4 text-left transition active:scale-[0.98] ${selected.serviceType?._id === svc._id ? 'border-brand-600 bg-brand-50' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{svc.name}</p>
                            <p className="mt-0.5 text-sm text-gray-500">{svc.description}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            {isCurbItemsSvc(svc) ? (
                              <>
                                <p className="font-bold text-brand-600">${curbItemPrice.toFixed(2)}</p>
                                <p className="text-xs text-gray-400">per item (≤25 lbs)</p>
                              </>
                            ) : isEntranceCleaningSvc(svc) ? (
                              <>
                                <p className="font-bold text-brand-600">From ${ecPerFloor}</p>
                                <p className="text-xs text-gray-400">custom pricing</p>
                              </>
                            ) : (
                              <>
                                <p className="font-bold text-brand-600">${isBothSvc(svc) ? perBarrelBoth.toFixed(2) : perBarrel.toFixed(2)}/barrel</p>
                                <p className="text-xs text-gray-400">{isBothSvc(svc) ? '2 jobs created' : 'per service'}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Address Selection */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold">Service Address</h2>
              <p className="mt-1 text-sm text-gray-500">
                {addresses.length > 1
                  ? 'Select one or more properties with the same trash day to schedule them together.'
                  : 'Where should we provide service? Your barrel details will be loaded automatically.'}
              </p>

              {selectedAddresses.length > 1 && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 border border-brand-200 px-4 py-2.5">
                  <svg className="h-4 w-4 shrink-0 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  <p className="text-sm font-semibold text-brand-700">{selectedAddresses.length} properties selected</p>
                  <button className="ml-auto text-xs text-brand-500 underline" onClick={() => { setSelectedAddresses([]); setSelected((prev) => ({ ...prev, addressId: '', trashDay: '' })); }}>Clear</button>
                </div>
              )}

              {addresses.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddresses.some((a) => a._id === addr._id);
                    const primaryAddr = selectedAddresses[0];
                    const differentDay = primaryAddr && primaryAddr._id !== addr._id && primaryAddr.trashDay && addr.trashDay && addr.trashDay !== primaryAddr.trashDay;
                    const addrHasSub = selected.bookingType === 'subscription' && activeSubs.some((s) => {
                      const id = s.addressId?._id || s.addressId;
                      const svcId = s.serviceTypeId?._id || s.serviceTypeId;
                      return (id === addr._id || String(id) === String(addr._id))
                        && (svcId === selected.serviceTypeId || String(svcId) === String(selected.serviceTypeId));
                    });
                    return (
                      <button key={addr._id} disabled={differentDay} onClick={() => toggleAddress(addr)}
                        className={`w-full rounded-xl border-2 px-4 py-3 text-left transition ${differentDay ? 'opacity-40 cursor-not-allowed' : 'active:scale-[0.99]'} ${isSelected ? 'border-brand-600 bg-brand-50' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${isSelected ? 'border-brand-600 bg-brand-600' : 'border-gray-300'}`}>
                            {isSelected && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{addr.street}{addr.unit ? `, ${addr.unit}` : ''}</p>
                            <p className="text-sm text-gray-500">{addr.city}, {addr.state} {addr.zip}</p>
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                              {addr.barrelCount > 0 && <span>{addr.barrelCount} barrel{addr.barrelCount > 1 ? 's' : ''}</span>}
                              {addr.trashDay && <span>Trash day: {addr.trashDay}</span>}
                              {addr.barrelLocation && <span>Location: {addr.barrelLocation}</span>}
                            </div>
                            {zipWarnings[addr._id] && (
                              <p className="mt-1 text-xs font-medium text-amber-600">⚠ This zip code isn't in our service area yet</p>
                            )}
                            {locationWarnings[addr._id] && (
                              <p className="mt-1 text-xs font-medium text-amber-600">⚠ We couldn't verify this address — please double-check the street, city, and zip</p>
                            )}
                            {addrHasSub && (
                              <p className="mt-1 text-xs font-medium text-amber-600">Already has an active monthly subscription</p>
                            )}
                            {differentDay && (
                              <p className="mt-1 text-xs text-gray-400">Different trash day — select separately</p>
                            )}
                          </div>
                        </div>
                        {(addr.barrelPhotoUrl || addr.photos?.length > 0) && (
                          <div className="mt-2 flex gap-1.5 overflow-x-auto pl-8">
                            {addr.barrelPhotoUrl && <PhotoViewer src={addr.barrelPhotoUrl} alt="Barrel" className="h-16 w-20 shrink-0 rounded-lg object-cover" />}
                            {addr.photos?.map((url, i) => <PhotoViewer key={i} src={url} alt={`Photo ${i + 1}`} className="h-16 w-20 shrink-0 rounded-lg object-cover" />)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4">
                  <QuickAddAddress
                    title="Add your address to continue"
                    subtitle="Use my location to fill it in one tap, or enter it below."
                    variant="card"
                    compact={false}
                    onAdded={(addr, result) => {
                      setAddresses([addr]);
                      selectAddress(addr);
                      if (result && result.inServiceZone === false) setZipWarnings((prev) => ({ ...prev, [addr._id]: true }));
                      if (result && result.locationResolved === false) setLocationWarnings((prev) => ({ ...prev, [addr._id]: true }));
                    }}
                  />
                </div>
              )}

              {addresses.length > 0 && (
                <div className="mt-4">
                  <AddAddressForm
                    show={showAddForm}
                    onShowChange={setShowAddForm}
                    onAdded={(addr) => {
                      if (addr._locationWarning) setLocationWarnings((prev) => ({ ...prev, [addr._id]: true }));
                      setAddresses([...addresses, addr]);
                      selectAddress(addr);
                    }}
                  />
                </div>
              )}

              {anyZipNotServed && (
                <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 text-center">
                  <h3 className="text-sm font-bold text-gray-900">One or more addresses aren't in our service area yet</h3>
                  <p className="mt-1 text-xs text-gray-600">Please deselect those addresses to continue.</p>
                </div>
              )}

              {selected.addressId && !anyZipNotServed && !isEntranceCleaning() && (
                <CascadingDatePicker
                  key={selected.addressId}
                  trashDay={selected.trashDay}
                  selectedDate={selected.date}
                  onChange={(dateStr, dow) => setSelected((prev) => ({ ...prev, date: dateStr, trashDay: dow }))}
                />
              )}

              {selected.addressId && !anyZipNotServed && isEntranceCleaning() && (
                <div className="mt-4">
                  <label className="text-sm font-semibold text-gray-700">What date would you like service?</label>
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={selected.date}
                    onChange={(e) => {
                      const d = new Date(e.target.value + 'T12:00:00');
                      if (d.getDay() === 0) {
                        setError('Entrance cleaning is available Monday through Saturday only. Sundays are not available.');
                        setSelected((prev) => ({ ...prev, date: '' }));
                      } else {
                        setError('');
                        setSelected((prev) => ({ ...prev, date: e.target.value }));
                      }
                    }}
                    className="mt-2 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base font-medium focus:border-brand-600 focus:outline-none"
                  />
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                    <svg className="h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-blue-700">Available <strong>Monday–Saturday</strong>, service window <strong>10 AM – 4 PM</strong></p>
                  </div>
                </div>
              )}

              {selected.addressId && !anyZipNotServed && selected.date && dateFullyBooked && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-semibold text-red-700">This date is fully booked.</p>
                  <p className="mt-0.5 text-xs text-red-500">Please pick another day to continue.</p>
                </div>
              )}

              {selected.addressId && !anyZipNotServed && selected.date && !dateFullyBooked && (
                <button onClick={next}
                  className="mt-6 w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98]">
                  {isBatchMode ? `Continue with ${selectedAddresses.length} properties` : 'Continue'}
                </button>
              )}
            </div>
          )}

          {/* Step 3: Entrance Cleaning Details */}
          {step === 2 && isEntranceCleaning() && (
            <div>
              <h2 className="text-lg font-bold">Building Details</h2>
              <p className="mt-1 text-sm text-gray-500">Tell us about the building so we can give you an exact price.</p>

              {selectedAddr && (
                <div className="mt-3 rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <p className="text-sm text-gray-600">{selectedAddr.street}{selectedAddr.unit ? `, ${selectedAddr.unit}` : ''}, {selectedAddr.city}</p>
                  </div>
                </div>
              )}

              {/* Plan toggle for EC */}
              <div className="mt-5">
                <label className="text-sm font-medium text-gray-700">Service Plan</label>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setSelected((p) => ({ ...p, bookingType: 'one-time' }))}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition ${selected.bookingType === 'one-time' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-100 text-gray-500'}`}>
                    One-Time
                  </button>
                  <button onClick={() => !hasActiveSubForAddress && setSelected((p) => ({ ...p, bookingType: 'subscription' }))}
                    disabled={hasActiveSubForAddress}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition ${hasActiveSubForAddress ? 'border-gray-100 text-gray-300 cursor-not-allowed' : selected.bookingType === 'subscription' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-500'}`}>
                    Monthly (bi-weekly)
                  </button>
                </div>
                {selected.bookingType === 'subscription' && (
                  <p className="mt-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                    Monthly plan includes <strong>2 cleanings per month</strong> at discounted rates — about 20% off the one-time price.
                  </p>
                )}
                {hasActiveSubForAddress && (
                  <p className="mt-2 text-xs text-amber-600">You already have an active monthly subscription for this address.</p>
                )}
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Number of floors to clean <span className="text-red-500">*</span></label>
                  <p className="mt-0.5 text-xs text-gray-400">Each floor includes vacuuming and mopping. {selected.bookingType === 'subscription' ? `$${ecMonthlyPerFloor}/floor (monthly rate)` : `$${ecPerFloor}/floor`}.</p>
                  <div className="mt-2 flex items-center gap-4">
                    <button onClick={() => setSelected((p) => ({ ...p, floors: Math.max(1, p.floors - 1) }))}
                      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-200 text-xl font-bold text-gray-600 transition hover:border-brand-400 active:scale-95 disabled:opacity-30"
                      disabled={selected.floors <= 1}>−</button>
                    <span className="min-w-[3rem] text-center text-2xl font-bold">{selected.floors}</span>
                    <button onClick={() => setSelected((p) => ({ ...p, floors: p.floors + 1 }))}
                      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-200 text-xl font-bold text-gray-600 transition hover:border-brand-400 active:scale-95">+</button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Number of staircases/flights <span className="text-red-500">*</span></label>
                  <p className="mt-0.5 text-xs text-gray-400">Includes vacuum and mop. {selected.bookingType === 'subscription' ? `$${ecMonthlyPerStair}/staircase (monthly rate)` : `$${ecPerStair}/staircase`}. Enter 0 if none.</p>
                  <div className="mt-2 flex items-center gap-4">
                    <button onClick={() => setSelected((p) => ({ ...p, staircases: Math.max(0, p.staircases - 1) }))}
                      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-200 text-xl font-bold text-gray-600 transition hover:border-brand-400 active:scale-95 disabled:opacity-30"
                      disabled={selected.staircases <= 0}>−</button>
                    <span className="min-w-[3rem] text-center text-2xl font-bold">{selected.staircases}</span>
                    <button onClick={() => setSelected((p) => ({ ...p, staircases: p.staircases + 1 }))}
                      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-200 text-xl font-bold text-gray-600 transition hover:border-brand-400 active:scale-95">+</button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Optional add-ons</label>
                  <p className="mt-0.5 text-xs text-gray-400">{selected.bookingType === 'subscription' ? `$${ecMonthlyEntranceFee}` : `$${ecEntranceFee}`} each — sweep, mop, and wipe down the entrance area.</p>
                  <div className="mt-3 space-y-2.5">
                    <button onClick={() => setSelected((p) => ({ ...p, frontEntrance: !p.frontEntrance }))}
                      className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition active:scale-[0.99] ${selected.frontEntrance ? 'border-brand-600 bg-brand-50' : 'border-gray-200'}`}>
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${selected.frontEntrance ? 'border-brand-600 bg-brand-600' : 'border-gray-300'}`}>
                        {selected.frontEntrance && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">Front entrance cleaning</p>
                        <p className="text-xs text-gray-500">Sweep, mop, and wipe down the front door area</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-brand-600">+${selected.bookingType === 'subscription' ? ecMonthlyEntranceFee : ecEntranceFee}</span>
                    </button>
                    <button onClick={() => setSelected((p) => ({ ...p, backEntrance: !p.backEntrance }))}
                      className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition active:scale-[0.99] ${selected.backEntrance ? 'border-brand-600 bg-brand-50' : 'border-gray-200'}`}>
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${selected.backEntrance ? 'border-brand-600 bg-brand-600' : 'border-gray-300'}`}>
                        {selected.backEntrance && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">Back entrance cleaning</p>
                        <p className="text-xs text-gray-500">Sweep, mop, and wipe down the back door area</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-brand-600">+${selected.bookingType === 'subscription' ? ecMonthlyEntranceFee : ecEntranceFee}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Optional area photos */}
              <div className="mt-5">
                <label className="text-sm font-semibold text-gray-700">Photos of the area <span className="text-gray-400 font-normal">(optional)</span></label>
                <p className="mt-0.5 text-xs text-gray-400">Help your servicer prepare — upload up to 5 photos of the hallways, staircases, or entrances to be cleaned.</p>
                {cleaningPreviews.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cleaningPreviews.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={url} alt={`Area photo ${i + 1}`} className="h-20 w-24 rounded-lg object-cover border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => removeCleaningPhoto(i)}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
                          aria-label="Remove photo"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {cleaningPhotos.length < 5 && (
                  <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3.5 text-sm font-medium text-gray-400 transition hover:border-brand-400 hover:text-brand-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {cleaningPhotos.length === 0 ? 'Add photos of the area' : `Add more (${cleaningPhotos.length}/5)`}
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={handleCleaningPhotos} />
                  </label>
                )}
              </div>

              {(() => {
                const ecIsMonthly = selected.bookingType === 'subscription';
                const pF = ecIsMonthly ? ecMonthlyPerFloor : ecPerFloor;
                const pS = ecIsMonthly ? ecMonthlyPerStair : ecPerStair;
                const pE = ecIsMonthly ? ecMonthlyEntranceFee : ecEntranceFee;
                return (
                  <div className="mt-6 rounded-xl bg-brand-50 p-4 space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-700 mb-2">
                      Price Breakdown{ecIsMonthly ? ' · per cleaning' : ''}
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Floors ({selected.floors} × ${pF})</span>
                      <span className="font-semibold">${(selected.floors * pF).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Staircases ({selected.staircases} × ${pS})</span>
                      <span className="font-semibold">${(selected.staircases * pS).toFixed(2)}</span>
                    </div>
                    {selected.frontEntrance && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Front entrance</span>
                        <span className="font-semibold">${pE.toFixed(2)}</span>
                      </div>
                    )}
                    {selected.backEntrance && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Back entrance</span>
                        <span className="font-semibold">${pE.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="mt-2 border-t border-brand-200 pt-2 flex justify-between">
                      <span className="font-bold text-gray-900">{ecIsMonthly ? 'Per cleaning' : 'Total'}</span>
                      <span className="text-xl font-bold text-brand-600">${entranceCleaningTotal().toFixed(2)}</span>
                    </div>
                    {ecIsMonthly && (
                      <div className="flex justify-between text-sm text-green-700 font-semibold pt-1">
                        <span>Monthly total (2 cleanings)</span>
                        <span>${(entranceCleaningTotal() * 2).toFixed(2)}/mo</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5">
                <svg className="h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-blue-700">Your servicer will arrive between <strong>10 AM and 4 PM</strong> on the selected date. You won&apos;t be charged until the job is complete.</p>
              </div>

              <button onClick={next}
                className="mt-5 w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98]">
                Review &amp; Confirm
              </button>
            </div>
          )}

          {/* Step 3: Service Details (pre-filled from address) */}
          {step === 2 && isCurbItems() && (
            <div>
              <h2 className="text-lg font-bold">Curb Item Details</h2>
              <p className="mt-1 text-sm text-gray-500">Tell us what needs to go to the curb</p>

              {selectedAddr && (
                <div className="mt-3 rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <p className="text-sm text-gray-600">{selectedAddr.street}{selectedAddr.unit ? `, ${selectedAddr.unit}` : ''}, {selectedAddr.city}</p>
                  </div>
                </div>
              )}

              <div className="mt-5">
                <label className="text-sm font-medium text-gray-700">How many items? (max 10)</label>
                <div className="mt-2 flex items-center gap-4">
                  <button onClick={() => setSelected({ ...selected, itemCount: Math.max(1, selected.itemCount - 1) })}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 text-lg font-bold text-gray-600 transition hover:border-brand-400 active:scale-95 disabled:opacity-30" disabled={selected.itemCount <= 1}>
                    −
                  </button>
                  <span className="min-w-[3rem] text-center text-2xl font-bold">{selected.itemCount}</span>
                  <button onClick={() => setSelected({ ...selected, itemCount: Math.min(10, selected.itemCount + 1) })}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 text-lg font-bold text-gray-600 transition hover:border-brand-400 active:scale-95 disabled:opacity-30" disabled={selected.itemCount >= 10}>
                    +
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <label className="text-sm font-medium text-gray-700">What are the items?</label>
                <textarea
                  placeholder="Describe the items (e.g., 2 bags of yard waste, 1 box of recycling)"
                  value={selected.curbItemNotes}
                  onChange={(e) => setSelected({ ...selected, curbItemNotes: e.target.value })}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              <div className="mt-5">
                <label className="text-sm font-medium text-gray-700">Photos of item(s) <span className="text-red-500">*</span></label>
                <p className="mt-0.5 text-xs text-gray-400">Take a photo showing the item(s) and where they are located. At least 1 photo is required.</p>
                {curbItemPreviews.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {curbItemPreviews.map((url, i) => (
                      <div key={i} className="relative min-w-0">
                        <PhotoViewer src={url} alt={`Item ${i + 1}`} className="h-24 w-full rounded-lg object-cover" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeCurbItemPhoto(i); }} className="absolute top-1 right-1 z-10 rounded-full bg-black/50 p-1 text-white">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {curbItemPhotos.length < 5 && (
                  <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {curbItemPhotos.length === 0 ? 'Add photos of your items' : `Add more (${curbItemPhotos.length}/5)`}
                    <input type="file" accept="image/*" multiple onChange={handleCurbItemPhotos} className="hidden" />
                  </label>
                )}
              </div>

              {selected.date && (
                <div className="mt-5">
                  <label className="text-sm font-bold text-gray-900">Service date</label>
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
                    <svg className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <p className="font-semibold text-brand-700">
                      {new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-xl bg-brand-50 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-gray-700">Total</span>
                  <span className="text-xl font-bold text-brand-600">${(curbItemPrice * selected.itemCount).toFixed(2)}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">${curbItemPrice.toFixed(2)} &times; {selected.itemCount} item{selected.itemCount > 1 ? 's' : ''}, each up to 25 lbs, from storage to curb</p>
              </div>

              <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-700 uppercase">Common items</p>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  Bags of yard waste, boxes of recycling, small furniture, broken appliances, old electronics, or anything under 25 lbs with a valid permit or that can legally be left at the curb for pickup.
                </p>
              </div>

              <div className="mt-3 flex gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <svg className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <div className="text-xs text-amber-800 leading-relaxed">
                  <p><strong>This service is not for barrel rollout.</strong> Use &ldquo;Put Out&rdquo; or &ldquo;Bring In&rdquo; for barrel services.</p>
                  <p className="mt-1">Each item must be up to 25 lbs and legally allowed at the curb. Your servicer may deny the request if items are unreasonable (too heavy, hazardous, etc.). You will not be charged if denied.</p>
                </div>
              </div>

              <button onClick={next} disabled={curbItemPhotos.length === 0}
                className="mt-6 w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-40">
                {curbItemPhotos.length === 0 ? 'Add at least 1 photo to continue' : 'Continue'}
              </button>
            </div>
          )}

          {step === 2 && !isCurbItems() && !isEntranceCleaning() && (
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
                  {(selectedAddr.barrelPhotoUrl || selectedAddr.photos?.length > 0) && (
                    <div className="mt-2 flex gap-1.5 overflow-x-auto">
                      {selectedAddr.barrelPhotoUrl && <PhotoViewer src={selectedAddr.barrelPhotoUrl} alt="Barrel" className="h-16 w-20 shrink-0 rounded-lg object-cover" />}
                      {selectedAddr.photos?.map((url, i) => <PhotoViewer key={i} src={url} alt={`Photo ${i + 1}`} className="h-16 w-20 shrink-0 rounded-lg object-cover" />)}
                    </div>
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
                  <button onClick={() => !hasActiveSubForAddress && setSelected({ ...selected, bookingType: 'subscription' })}
                    disabled={hasActiveSubForAddress}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition ${hasActiveSubForAddress ? 'border-gray-100 text-gray-300 cursor-not-allowed' : selected.bookingType === 'subscription' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-500'}`}>
                    Monthly
                  </button>
                </div>
                {hasActiveSubForAddress && (
                  <p className="mt-2 text-xs text-amber-600">You already have an active monthly subscription for this address.</p>
                )}
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
                          <span className="text-gray-600">Put out: {selected.barrelCount} barrel{selected.barrelCount > 1 ? 's' : ''} × ${perBarrelBothLeg.toFixed(2)}</span>
                          <span className="font-medium">${(perBarrelBothLeg * selected.barrelCount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Bring in: {selected.barrelCount} barrel{selected.barrelCount > 1 ? 's' : ''} × ${perBarrelBothLeg.toFixed(2)}</span>
                          <span className="font-medium">${(perBarrelBothLeg * selected.barrelCount).toFixed(2)}</span>
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
                      <p className="mt-1 text-xs text-brand-600">This creates 2 separate jobs</p>
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
                        <span className="text-gray-600">{selected.barrelCount - monthlyIncluded} extra barrel{selected.barrelCount - monthlyIncluded > 1 ? 's' : ''} × ${extraBarrelMonthly}/mo</span>
                        <span className="font-medium">${((selected.barrelCount - monthlyIncluded) * extraBarrelMonthly)}/mo</span>
                      </div>
                    )}
                    <hr className="border-brand-200" />
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold text-gray-700">Monthly total</span>
                      <span className="text-xl font-bold text-brand-600">${monthlyPrice()}/mo</span>
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
                      <p className="mt-1 text-xs text-brand-600">Each week creates 2 separate jobs</p>
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

              {/* Put out / Bring in times */}
              {/* Put out time — fixed window, shown as confirmation */}
              {needsPutOut() && (
                <div className="mt-5">
                  <label className="text-sm font-semibold text-gray-900">When will we put your barrels out?</label>
                  <p className="mt-1 text-sm text-gray-500">
                    We put barrels out the <strong>evening before</strong> your trash day so they're ready when the truck comes in the morning.
                  </p>
                  <div className="mt-3 flex items-center gap-3 rounded-xl border-2 border-brand-200 bg-brand-50 px-4 py-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100">
                      <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-brand-800">5–9 PM the night before</p>
                      <p className="text-xs text-brand-600">
                        {selected.date
                          ? (() => {
                              const d = new Date(selected.date + 'T12:00:00');
                              d.setDate(d.getDate() - 1);
                              return `Evening of ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;
                            })()
                          : 'Evening before your trash day'}
                      </p>
                    </div>
                    <svg className="ml-auto h-5 w-5 shrink-0 text-brand-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Bring in time */}
              {needsBringIn() && (() => {
                return (
                  <div className="mt-5">
                    <label className="text-sm font-semibold text-gray-900">When should we bring your barrels back inside?</label>
                    <p className="mt-1 text-sm text-gray-500">
                      Pick a time window on your trash day. We'll bring your barrels back in after the truck has come through your street.
                    </p>
                    {selected.date && (
                      <p className="mt-1 text-sm font-semibold text-brand-700">
                        On pickup day —{' '}
                        {new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                    <div className="mt-3 space-y-2">
                      {BRING_IN_OPTIONS.map((opt) => {
                        const past = isTimeWindowPast(opt.value, false);
                        const isSelected = selected.bringInTime === opt.value;
                        return (
                          <button
                            key={opt.value}
                            disabled={past}
                            onClick={() => !past && setSelected({ ...selected, bringInTime: opt.value })}
                            className={`w-full rounded-xl border-2 px-4 py-3.5 text-left transition active:scale-[0.98] ${
                              past
                                ? 'border-gray-100 opacity-40 cursor-not-allowed'
                                : isSelected
                                  ? 'border-brand-600 bg-brand-50'
                                  : 'border-gray-100 hover:border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className={`font-semibold ${isSelected ? 'text-brand-800' : 'text-gray-800'}`}>
                                  {opt.label} <span className="font-normal text-gray-500">({opt.time})</span>
                                </p>
                                <p className={`mt-0.5 text-xs ${isSelected ? 'text-brand-600' : 'text-gray-400'}`}>{opt.hint}</p>
                              </div>
                              {isSelected && (
                                <svg className="h-5 w-5 shrink-0 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      Not sure? Choose <strong>Afternoon</strong> — that works for most neighborhoods.
                    </p>
                  </div>
                );
              })()}

              {selected.bookingType === 'subscription' && selected.date && (
                <div className="mt-5">
                  <ScheduledServicesPreview startDate={selected.date} />
                </div>
              )}

              <button onClick={next} disabled={!selected.trashDay || (needsBringIn() && !selected.bringInTime)}
                className="mt-6 w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-40">
                Continue
              </button>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 3 && isCurbItems() && (
            <div>
              <h2 className="text-lg font-bold">Confirm Booking</h2>
              <p className="mt-1 text-sm text-gray-500">
                {isBatchMode ? `Review your curb item service — ${selectedAddresses.length} properties` : 'Review your curb item service'}
              </p>

              {/* Multi-property banner for curb items */}
              {isBatchMode && (
                <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
                  <p className="text-sm font-semibold text-brand-800">Scheduling {selectedAddresses.length} properties on the same day</p>
                  <div className="mt-2 space-y-2">
                    {selectedAddresses.map((addr) => (
                      <div key={addr._id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="truncate text-xs font-semibold text-gray-800">{addr.street}{addr.unit ? `, ${addr.unit}` : ''}</p>
                          <p className="text-xs text-gray-400">{addr.city}, {addr.state}</p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-brand-600">${(curbItemPrice * selected.itemCount).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-brand-200 pt-2">
                      <span className="text-sm font-semibold text-gray-700">Total</span>
                      <span className="text-base font-bold text-brand-600">${(curbItemPrice * selected.itemCount * selectedAddresses.length).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-3 rounded-xl bg-gray-50 p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Service</span>
                  <span className="text-sm font-medium">Curb Items</span>
                </div>
                {!isBatchMode && (
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0 text-sm text-gray-500">Address</span>
                    <span className="min-w-0 break-words text-right text-sm font-medium">{selectedAddr?.street}{selectedAddr?.unit ? `, ${selectedAddr.unit}` : ''}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Items</span>
                  <span className="text-sm font-medium">{selected.itemCount} per property</span>
                </div>
                {selected.curbItemNotes && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Description</span>
                    <span className="text-sm font-medium text-right max-w-[60%]">{selected.curbItemNotes}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Date</span>
                  <span className="text-sm font-medium">{new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                {curbItemPreviews.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Item photos ({curbItemPreviews.length})</p>
                    <div className="grid grid-cols-3 gap-2">
                      {curbItemPreviews.map((url, i) => (
                        <PhotoViewer key={i} src={url} alt={`Item ${i + 1}`} className="h-20 w-full rounded-lg object-cover" />
                      ))}
                    </div>
                  </div>
                )}
                {!isBatchMode && (
                  <>
                    <hr className="border-gray-200" />
                    <div className="flex justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-brand-600">${(curbItemPrice * selected.itemCount).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
                <span>Your card on file will be charged <strong>${isBatchMode ? (curbItemPrice * selected.itemCount * selectedAddresses.length).toFixed(2) : (curbItemPrice * selected.itemCount).toFixed(2)}</strong> after service completion.</span>
              </div>

              {bookingConfirmed ? (
                <div className="mt-6 flex flex-col items-center py-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-gray-900">Booking Confirmed!</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    {isBatchMode
                      ? `${selectedAddresses.length} curb item services scheduled for ${new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}.`
                      : `Your curb item service ($${(curbItemPrice * selected.itemCount).toFixed(2)}) has been scheduled.`}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">Redirecting to your dashboard...</p>
                  <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full animate-pulse rounded-full bg-brand-600" style={{ width: '100%' }} />
                  </div>
                </div>
              ) : (
                <button onClick={handleConfirm} disabled={submitting}
                  className="mt-6 w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50">
                  {submitting ? 'Processing...' : isBatchMode ? `Confirm ${selectedAddresses.length} Bookings` : 'Confirm Booking'}
                </button>
              )}
            </div>
          )}

          {step === 3 && isEntranceCleaning() && (
            <div>
              <h2 className="text-lg font-bold">Confirm Cleaning Request</h2>
              <p className="mt-1 text-sm text-gray-500">Review your building details and price</p>

              {(() => {
                const ecIsMonthly = selected.bookingType === 'subscription';
                const pF = ecIsMonthly ? ecMonthlyPerFloor : ecPerFloor;
                const pS = ecIsMonthly ? ecMonthlyPerStair : ecPerStair;
                const pE = ecIsMonthly ? ecMonthlyEntranceFee : ecEntranceFee;
                return (
                  <>
                    <div className="mt-4 space-y-2.5 rounded-xl bg-gray-50 p-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Service</span>
                        <span className="text-sm font-medium">{selected.serviceType?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Plan</span>
                        <span className="text-sm font-medium">{ecIsMonthly ? 'Monthly (bi-weekly)' : 'One-Time'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="shrink-0 text-sm text-gray-500">Address</span>
                        <span className="min-w-0 break-words text-right text-sm font-medium">{selectedAddr?.street}{selectedAddr?.unit ? `, ${selectedAddr.unit}` : ''}</span>
                      </div>
                      {!ecIsMonthly && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Date</span>
                          <span className="text-sm font-medium">{new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                      {ecIsMonthly && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Start week</span>
                          <span className="text-sm font-medium">Week of {new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Floors</span>
                        <span className="text-sm font-medium">{selected.floors} × ${pF} = ${(selected.floors * pF).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Staircases</span>
                        <span className="text-sm font-medium">{selected.staircases} × ${pS} = ${(selected.staircases * pS).toFixed(2)}</span>
                      </div>
                      {selected.frontEntrance && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Front entrance</span>
                          <span className="text-sm font-medium">${pE.toFixed(2)}</span>
                        </div>
                      )}
                      {selected.backEntrance && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Back entrance</span>
                          <span className="text-sm font-medium">${pE.toFixed(2)}</span>
                        </div>
                      )}
                      <hr className="border-gray-200" />
                      <div className="flex justify-between">
                        <span className="font-semibold">{ecIsMonthly ? 'Per cleaning' : 'Total'}</span>
                        <span className="font-bold text-brand-600">${entranceCleaningTotal().toFixed(2)}</span>
                      </div>
                      {ecIsMonthly && (
                        <div className="flex justify-between text-sm text-green-700 font-semibold">
                          <span>Monthly total (2 cleanings)</span>
                          <span>${(entranceCleaningTotal() * 2).toFixed(2)}/mo</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                      {ecIsMonthly
                        ? <span>You will be charged <strong>${(entranceCleaningTotal() * 2).toFixed(2)}/month</strong> today and on the same date each month. Cancel anytime.</span>
                        : <span>Your card on file will be charged <strong>${entranceCleaningTotal().toFixed(2)}</strong> after service completion.</span>
                      }
                    </div>
                  </>
                );
              })()}

              {bookingConfirmed ? (
                <div className="mt-6 flex flex-col items-center py-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-gray-900">{selected.bookingType === 'subscription' ? 'Subscription Started!' : 'Booking Confirmed!'}</h2>
                  <p className="mt-2 text-sm text-gray-500">{selected.bookingType === 'subscription' ? 'Your bi-weekly entrance cleaning subscription is active.' : `Entrance cleaning scheduled for ${selected.date ? new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : ''}.`}</p>
                  <p className="mt-1 text-xs text-gray-400">Redirecting to your dashboard...</p>
                </div>
              ) : (
                <button onClick={handleConfirm} disabled={submitting}
                  className="mt-6 w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50">
                  {submitting ? 'Processing...' : selected.bookingType === 'subscription' ? 'Start Subscription' : 'Confirm Booking'}
                </button>
              )}
            </div>
          )}

          {step === 3 && !isCurbItems() && !isEntranceCleaning() && (
            <div>
              <h2 className="text-lg font-bold">Confirm Booking</h2>
              <p className="mt-1 text-sm text-gray-500">Review your service details</p>

              {isBatchMode && (
                <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
                  <p className="text-sm font-semibold text-brand-800">Scheduling {selectedAddresses.length} properties on the same day</p>
                  <div className="mt-2 space-y-2">
                    {selectedAddresses.map((addr) => (
                      <div key={addr._id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="truncate text-xs font-semibold text-gray-800">{addr.street}{addr.unit ? `, ${addr.unit}` : ''}</p>
                          <p className="text-xs text-gray-400">{addr.city}, {addr.state}</p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-brand-600">${oneTimePrice().toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-brand-200 pt-2">
                      <span className="text-sm font-semibold text-gray-700">Total</span>
                      <span className="text-base font-bold text-brand-600">${(oneTimePrice() * selectedAddresses.length).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {selected.bookingType === 'subscription' ? (
                <div className="mt-4 space-y-2">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    <strong>Monthly Subscription — 4 Services</strong>
                    <p className="mt-1 text-xs text-green-700">
                      Your subscription includes 4 weekly services starting{' '}
                      {selected.date && new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
                      All 4 appointments are automatically scheduled and cannot be individually cancelled.
                      {isBoth() && ' Each week creates 2 jobs, one for put out and one for bring in.'}
                    </p>
                  </div>
                  {selected.date && (
                    <ScheduledServicesPreview startDate={selected.date} />
                  )}
                </div>
              ) : !isBatchMode && isBoth() ? (
                <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700">
                  <strong>Note:</strong> This creates 2 separate jobs, one for put out and one for bring in. Each can be handled by any servicer.
                </div>
              ) : null}

              {!isBatchMode && (
                <div className="mt-4 space-y-3 rounded-xl bg-gray-50 p-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Service</span>
                    <span className="text-sm font-medium">{selected.serviceType?.name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0 text-sm text-gray-500">Address</span>
                    <span className="min-w-0 break-words text-right text-sm font-medium">{selectedAddr?.street}{selectedAddr?.unit ? `, ${selectedAddr.unit}` : ''}</span>
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
                      <span className="text-sm font-medium">Night before, 5–9 PM</span>
                    </div>
                  )}
                  {selected.bringInTime && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Bring In</span>
                      <span className="text-sm font-medium">{BRING_IN_OPTIONS.find(o => o.value === selected.bringInTime)?.label || selected.bringInTime}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Date</span>
                    <span className="text-sm font-medium">{new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                  {(selectedAddr?.barrelPhotoUrl || selectedAddr?.photos?.length > 0) && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Photos (visible to servicer)</p>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedAddr.barrelPhotoUrl && (
                          <PhotoViewer src={selectedAddr.barrelPhotoUrl} alt="Barrel" className="h-20 w-full rounded-lg object-cover" />
                        )}
                        {selectedAddr.photos?.map((url, i) => (
                          <PhotoViewer key={i} src={url} alt={`Photo ${i + 1}`} className="h-20 w-full rounded-lg object-cover" />
                        ))}
                      </div>
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
              )}

              {isBatchMode && (
                <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service</span>
                    <span className="font-medium">{selected.serviceType?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Trash Day</span>
                    <span className="font-medium">{selected.trashDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium">{new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                  {selected.putOutTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Put Out</span>
                      <span className="font-medium">Night before, 5–9 PM</span>
                    </div>
                  )}
                  {selected.bringInTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bring In</span>
                      <span className="font-medium">{BRING_IN_OPTIONS.find(o => o.value === selected.bringInTime)?.label || selected.bringInTime}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
                {selected.bookingType === 'subscription'
                  ? <span>You will be charged <strong>${currentPrice().toFixed(2)}/month</strong> today and on the same date each month. Cancel anytime.</span>
                  : <span>Your card on file will be charged <strong>${isBatchMode ? (oneTimePrice() * selectedAddresses.length).toFixed(2) : currentPrice().toFixed(2)}</strong> after service completion.</span>
                }
              </div>

              <div className="mt-4 flex gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <svg className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <div className="text-xs text-amber-800 leading-relaxed">
                  <p><strong>Heads up:</strong> Please make sure your instructions are accurate. If things look different when the servicer arrives, they may use their best judgement or only handle the barrels you requested.</p>
                  <p className="mt-1.5">Barrels must be manageable for rollout. If a barrel is unreasonably overflowing with trash, your servicer may decline the service. You will not be charged if declined.</p>
                </div>
              </div>

              {bookingConfirmed ? (
                <div className="mt-6 flex flex-col items-center py-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-gray-900">Booking Confirmed!</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    {selected.bookingType === 'subscription'
                      ? `Your subscription ($${monthlyPrice().toFixed(2)}/mo) is active.`
                      : isBatchMode
                        ? `${selectedAddresses.length} properties scheduled for ${new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}.`
                        : `Your service ($${oneTimePrice().toFixed(2)}) has been scheduled.`}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">Redirecting to your dashboard...</p>
                  <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full animate-pulse rounded-full bg-brand-600" style={{ width: '100%' }} />
                  </div>
                </div>
              ) : (
                <button onClick={handleConfirm} disabled={submitting}
                  className="mt-6 w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50">
                  {submitting ? 'Processing...' : selected.bookingType === 'subscription' ? 'Start Subscription' : isBatchMode ? `Confirm ${selectedAddresses.length} Bookings` : 'Confirm Booking'}
                </button>
              )}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
}

function CascadingDatePicker({ trashDay: initialTrashDay, selectedDate, onChange }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const today = new Date(currentYear, currentMonth, now.getDate());

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDow = dayNames[today.getDay()];

  function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const todayStr = toDateStr(today);
  const isSunday = today.getDay() === 0;

  const [mode, setMode] = useState('future');
  const [activeDay, setActiveDay] = useState(initialTrashDay || 'Monday');

  const dayMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };
  const targetDow = dayMap[activeDay];

  function getDaysForMonth(m, dow) {
    const d_ow = dow ?? targetDow;
    if (d_ow == null) return [];
    const days = [];
    const d = new Date(currentYear, m, 1, 12, 0, 0);
    while (d.getDay() !== d_ow) d.setDate(d.getDate() + 1);
    while (d.getMonth() === m) {
      if (d > today) days.push(new Date(d));
      d.setDate(d.getDate() + 7);
    }
    return days;
  }

  function firstMonthWithDates(dow) {
    for (let m = currentMonth; m <= 11; m++) {
      if (getDaysForMonth(m, dow).length > 0) return m;
    }
    return currentMonth;
  }

  const [month, setMonth] = useState(() => {
    if (selectedDate && selectedDate !== todayStr) return new Date(selectedDate + 'T12:00:00').getMonth();
    return firstMonthWithDates();
  });

  const availableDays = useMemo(() => getDaysForMonth(month), [month, activeDay]);

  const months = useMemo(() => {
    const list = [];
    for (let m = currentMonth; m <= 11; m++) list.push(m);
    return list;
  }, []);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function selectToday() {
    setMode('today');
    onChange(todayStr, todayDow);
  }

  function selectFuture() {
    setMode('future');
    const startMonth = firstMonthWithDates();
    setMonth(startMonth);
    const days = getDaysForMonth(startMonth);
    if (days.length > 0) {
      onChange(toDateStr(days[0]), activeDay);
    } else {
      onChange('', activeDay);
    }
  }

  function handleTrashDayChange(newDay) {
    setActiveDay(newDay);
    const dow = dayMap[newDay];
    const startMonth = firstMonthWithDates(dow);
    setMonth(startMonth);
    const days = getDaysForMonth(startMonth, dow);
    if (days.length > 0) {
      onChange(toDateStr(days[0]), newDay);
    } else {
      onChange('', newDay);
    }
  }

  function handleMonthChange(newMonth) {
    setMonth(newMonth);
    const days = getDaysForMonth(newMonth);
    if (days.length > 0) {
      onChange(toDateStr(days[0]), activeDay);
    } else {
      onChange('', activeDay);
    }
  }

  function handleDayChange(dateStr) {
    onChange(dateStr, activeDay);
  }

  useEffect(() => {
    if (mode === 'today') return;
    if (!activeDay || targetDow == null) return;
    if (selectedDate && selectedDate !== todayStr) return;
    const startMonth = firstMonthWithDates();
    setMonth(startMonth);
    const days = getDaysForMonth(startMonth);
    if (days.length > 0) onChange(toDateStr(days[0]), activeDay);
  }, [activeDay]);

  if (!activeDay) return null;

  return (
    <div className="mt-5">
      <label className="text-sm font-bold text-gray-900">Service date</label>
      <p className="mt-0.5 text-xs text-gray-500">Need service today or on a future date?</p>

      <div className="mt-3 flex gap-2">
        {!isSunday && (
          <button
            type="button"
            onClick={selectToday}
            className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition ${mode === 'today' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
          >
            <span className="block text-base font-semibold">Today</span>
            <span className="block text-xs mt-0.5 opacity-70">{todayDow}</span>
          </button>
        )}
        <button
          type="button"
          onClick={selectFuture}
          className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition ${mode === 'future' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
        >
          <span className="block text-base font-semibold">Future date</span>
          <span className="block text-xs mt-0.5 opacity-70">Pick a day</span>
        </button>
      </div>

      {mode === 'today' && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
          <svg className="h-5 w-5 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="font-semibold text-brand-700">
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      )}

      {mode === 'future' && (
        <>
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-500">Trash day</label>
            <select
              value={activeDay}
              onChange={(e) => handleTrashDayChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex gap-2">
            <select
              value={month}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-700 focus:border-brand-500 focus:outline-none"
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
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-700 focus:border-brand-500 focus:outline-none"
            >
              {availableDays.length === 0 && <option value="">No dates</option>}
              {availableDays.map((d) => (
                <option key={toDateStr(d)} value={toDateStr(d)}>
                  {d.toLocaleDateString('en-US', { weekday: 'short' })} {d.getDate()}
                </option>
              ))}
            </select>
            <div className="shrink-0 rounded-lg border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm font-medium text-gray-500">
              {currentYear}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ScheduledServicesPreview({ startDate }) {
  if (!startDate) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs font-semibold text-gray-500 uppercase">Scheduled Services</p>
      <div className="mt-2 space-y-1.5">
        {[0, 1, 2, 3].map((i) => {
          const d = new Date(startDate + 'T12:00:00');
          d.setDate(d.getDate() + i * 7);
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-600">{i + 1}</div>
              <span className="text-gray-700">{d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              {i === 0 && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-600">Starts</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddAddressForm({ onAdded, show, onShowChange }) {
  const [form, setForm] = useState({
    street: '', unit: '', city: '', state: '', zip: '',
    barrelCount: 1, barrelLocation: '', barrelNotes: '',
    barrelPlacementInstructions: '', barrelReturnInstructions: '', trashDay: '',
  });
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const update = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  function handlePhotos(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const allowed = 10 - photos.length;
    const toAdd = files.slice(0, allowed);
    setPhotos((prev) => [...prev, ...toAdd]);
    setPhotoPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  }

  function removePhoto(idx) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/addresses', {
        ...form,
        barrelCount: parseInt(form.barrelCount) || 1,
        formatted: `${form.street}, ${form.city}, ${form.state} ${form.zip}`,
        isDefault: true,
      });
      const addr = res.data.address;
      const locationResolved = res.data.locationResolved !== false;
      if (!locationResolved) {
        addr._locationWarning = true;
      }

      if (photos.length > 0) {
        const token = localStorage.getItem('accessToken');
        const fd = new FormData();
        fd.append('photo', photos[0]);
        const photoRes = await fetch(`/api/v1/addresses/${addr._id}/photo`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
        });
        const photoData = await photoRes.json();
        if (photoData.success) addr.barrelPhotoUrl = photoData.data.photoUrl;

        if (photos.length > 1) {
          const fd2 = new FormData();
          photos.slice(1).forEach((f) => fd2.append('photos', f));
          const multiRes = await fetch(`/api/v1/addresses/${addr._id}/photos`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd2,
          });
          const multiData = await multiRes.json();
          if (multiData.success) addr.photos = multiData.data.photos;
        }
      }

      onAdded(addr);
    } catch (err) { alert(err.message || 'Failed to add address'); }
    setSubmitting(false);
  }

  if (!show) {
    return (
      <button onClick={() => onShowChange(true)} className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 hover:border-brand-300 hover:text-brand-600">
        + Add New Address
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase">Address</p>
      <input type="text" placeholder="Street address" value={form.street} onChange={update('street')} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
      <input type="text" placeholder="Apt / Unit (optional)" value={form.unit} onChange={update('unit')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
      <input type="text" placeholder="City" value={form.city} onChange={update('city')} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
      <div className="flex gap-2">
        <input type="text" placeholder="State" value={form.state} onChange={update('state')} required className="w-20 shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        <input type="text" placeholder="ZIP" value={form.zip} onChange={update('zip')} required className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
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
        <label className="text-xs text-gray-500">Photos to help your servicer (up to 10)</label>
        <p className="text-[11px] text-gray-400 mt-0.5">Show where your barrels are, the curb spot, driveway, or anything that helps.</p>
        {photoPreviews.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {photoPreviews.map((url, i) => (
              <div key={i} className="relative min-w-0">
                <PhotoViewer src={url} alt={`Photo ${i + 1}`} className="h-24 w-full rounded-lg object-cover" />
                <button type="button" onClick={(e) => { e.stopPropagation(); removePhoto(i); }} className="absolute top-1 right-1 z-10 rounded-full bg-black/50 p-1 text-white">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 10 && (
          <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {photos.length === 0 ? 'Add photos of your barrels and location' : `Add more photos (${photos.length}/10)`}
            <input type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
          </label>
        )}
      </div>

      <button type="submit" disabled={submitting} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {submitting ? 'Saving...' : 'Save Address'}
      </button>
    </form>
  );
}
