'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../services/api';
import ReviewModal from '../../../components/ReviewModal';
import { useNotifications } from '../../../components/NotificationProvider';
import { useInstall } from '../../../components/InstallContext';
import AppStoreBadge from '../../../components/AppStoreBadge';
import Logo from '../../../components/Logo';
import PhotoViewer from '../../../components/PhotoViewer';

const SERVICER_SHARE = 0.30;

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-blue-100 text-blue-800',
  'en-route': 'bg-purple-100 text-purple-800',
  arrived: 'bg-indigo-100 text-indigo-800',
  'in-progress': 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  expired: 'bg-orange-100 text-orange-700',
};

function canAcceptToday(booking) {
  const scheduled = new Date(booking.scheduledDate);
  scheduled.setHours(0, 0, 0, 0);
  const earliest = booking.putOutTime === 'Night before'
    ? new Date(scheduled.getTime() - 86400000)
    : scheduled;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return { allowed: today >= earliest, earliest };
}

function JobCard({ booking, onAccept, accepting, onRate, alreadyRated }) {
  const date = new Date(booking.scheduledDate);
  const addr = booking.addressId;
  const svc = booking.serviceTypeId;
  const customer = booking.userId;
  const acceptCheck = booking.status === 'pending' ? canAcceptToday(booking) : null;

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-white">{svc?.name || 'Service'}</p>
            {booking.isGuaranteed && (
              <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wide">Guaranteed</span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-400">
            {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {svc?.slug === 'curb-items'
              ? <span className="mx-1">&middot; {booking.itemCount || 1} item{(booking.itemCount || 1) > 1 ? 's' : ''}</span>
              : svc?.slug === 'entrance-cleaning'
                ? <span className="mx-1">&middot; {booking.floors || 1} floor{(booking.floors || 1) > 1 ? 's' : ''}{booking.staircases > 0 ? `, ${booking.staircases} staircase${booking.staircases > 1 ? 's' : ''}` : ''}</span>
                : booking.barrelCount > 0 && <span className="mx-1">&middot; {booking.barrelCount} barrel{booking.barrelCount > 1 ? 's' : ''}</span>
            }
            <span className="mx-1">&middot; ${(Number(booking.serviceValue ?? booking.amount ?? 0) * SERVICER_SHARE).toFixed(2)}</span>
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[booking.status] || 'bg-gray-600 text-gray-300'}`}>
          {booking.status}
        </span>
      </div>

      {(booking.putOutTime || booking.bringInTime) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {booking.putOutTime && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-900/30 border border-blue-800/40 px-2.5 py-1 text-xs text-blue-300">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Put out: {booking.putOutTime}
            </span>
          )}
          {booking.bringInTime && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 border border-amber-800/40 px-2.5 py-1 text-xs text-amber-300">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Bring in: {booking.bringInTime}
            </span>
          )}
        </div>
      )}

      {addr && booking.status !== 'completed' && (
        <div className="mt-3 rounded-lg bg-gray-900/50 p-3">
          <p className="text-sm text-gray-300">{addr.street}{addr.unit ? `, ${addr.unit}` : ''}</p>
          <p className="text-xs text-gray-500">{addr.city}, {addr.state} {addr.zip}</p>
          {addr.barrelLocation && (
            <div className="mt-2 flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <p className="text-xs text-gray-400">{addr.barrelLocation}</p>
            </div>
          )}
          {addr.barrelPlacementInstructions && (
            <p className="mt-1 text-xs text-blue-400">Curb: {addr.barrelPlacementInstructions}</p>
          )}
          {addr.barrelReturnInstructions && (
            <p className="mt-0.5 text-xs text-amber-400">Return: {addr.barrelReturnInstructions}</p>
          )}
          {addr.barrelNotes && (
            <p className="mt-1 text-xs text-gray-500 italic">"{addr.barrelNotes}"</p>
          )}
          {(addr.barrelPhotoUrl || addr.photos?.length > 0) && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto">
              {addr.barrelPhotoUrl && <PhotoViewer src={addr.barrelPhotoUrl} alt="Barrel" className="h-20 w-24 shrink-0 rounded-lg object-cover" />}
              {addr.photos?.map((url, i) => <PhotoViewer key={i} src={url} alt={`Photo ${i + 1}`} className="h-20 w-24 shrink-0 rounded-lg object-cover" />)}
            </div>
          )}
          {svc?.slug === 'curb-items' && (
            <div className="mt-2 border-t border-gray-700 pt-2">
              <p className="text-xs font-medium text-brand-400">Curb Items ({booking.itemCount || 1})</p>
              {booking.curbItemNotes && <p className="mt-1 text-xs text-gray-400 italic">"{booking.curbItemNotes}"</p>}
              {booking.curbItemPhotos?.length > 0 && (
                <div className="mt-1.5 flex gap-1.5 overflow-x-auto">
                  {booking.curbItemPhotos.map((url, i) => <PhotoViewer key={i} src={url} alt={`Item ${i + 1}`} className="h-20 w-24 shrink-0 rounded-lg object-cover" />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {customer && booking.status !== 'completed' && (
        <div className="mt-2 flex items-center gap-2">
          {customer.profilePhotoUrl ? (
            <img src={customer.profilePhotoUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-[10px] font-bold text-gray-300">{customer.firstName?.[0]}{customer.lastName?.[0]}</div>
          )}
          <p className="text-xs text-gray-500">
            {customer.firstName} {customer.lastName}
          </p>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {booking.status === 'pending' && acceptCheck?.allowed && (
          <button onClick={() => onAccept(booking._id)} disabled={accepting}
            className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white transition hover:bg-green-700 active:scale-[0.98] disabled:opacity-50">
            {accepting ? 'Accepting...' : 'Accept Job'}
          </button>
        )}
        {booking.status === 'pending' && acceptCheck && !acceptCheck.allowed && (
          <div className="flex-1 rounded-lg border border-gray-600 bg-gray-900/50 py-2 text-center text-xs text-gray-400">
            Available {acceptCheck.earliest.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {booking.putOutTime === 'Night before' && <span className="block text-[10px] text-amber-400 mt-0.5">Night-before service</span>}
          </div>
        )}
        {['active', 'en-route', 'arrived', 'in-progress'].includes(booking.status) && (
          <>
            <Link href={`/servicer/job/${booking._id}`} className="flex-1 rounded-lg bg-brand-600 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-700">
              Manage Job
            </Link>
            <Link href={`/chat/${booking._id}`} className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-700">
              Chat
            </Link>
          </>
        )}
        {booking.status === 'completed' && !alreadyRated && (
          <button onClick={() => onRate(booking)} className="flex-1 rounded-lg bg-yellow-600/20 py-2 text-sm font-medium text-yellow-400 transition hover:bg-yellow-600/30">
            Rate Customer
          </button>
        )}
        {booking.status === 'completed' && alreadyRated && (
          <div className="flex-1 rounded-lg bg-green-900/30 py-2 text-center text-sm font-medium text-green-400">
            Rated
          </div>
        )}
      </div>
    </div>
  );
}

function isDueToday(booking) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const scheduled = new Date(booking.scheduledDate);
  if (booking.putOutTime === 'Night before') {
    const evening = new Date(scheduled);
    evening.setDate(evening.getDate() - 1);
    evening.setHours(0, 0, 0, 0);
    return today.getTime() === evening.getTime() || (scheduled >= today && scheduled < tomorrow);
  }
  return scheduled >= today && scheduled < tomorrow;
}

function CityGroup({ city, jobs, onAccept, accepting, onRate, reviewedMap }) {
  const todayCount = jobs.filter(isDueToday).length;
  const [open, setOpen] = useState(todayCount > 0);
  const totalValue = jobs.reduce((sum, b) => sum + Number(b.serviceValue ?? b.amount ?? 0), 0) * SERVICER_SHARE;
  const hasDueToday = todayCount > 0;

  return (
    <div className={`rounded-xl border overflow-hidden ${hasDueToday ? 'border-amber-500/60 bg-gray-800/80' : 'border-gray-700 bg-gray-800/60'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-gray-800 active:bg-gray-700/50"
      >
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${hasDueToday ? 'bg-amber-500/20' : 'bg-brand-600/20'}`}>
          <svg className={`h-5 w-5 ${hasDueToday ? 'text-amber-400' : 'text-brand-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18M5.25 3h13.5M5.25 21h13.5M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-white truncate">{city}</p>
            {hasDueToday && (
              <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-gray-900">
                {todayCount} today
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">{jobs.length} job{jobs.length !== 1 ? 's' : ''} &middot; ${totalValue.toFixed(2)}</p>
        </div>
        <svg className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="space-y-3 px-3 pb-3">
          {jobs.map((b) => (
            <JobCard key={b._id} booking={b} onAccept={onAccept} accepting={accepting} onRate={onRate} alreadyRated={reviewedMap[b._id]} />
          ))}
        </div>
      )}
    </div>
  );
}

const SVC_PILL_COLORS = {
  'put-out': 'bg-green-900/60 text-green-300 border-green-700/50',
  'bring-in': 'bg-blue-900/60 text-blue-300 border-blue-700/50',
  'both': 'bg-purple-900/60 text-purple-300 border-purple-700/50',
  'curb-items': 'bg-amber-900/60 text-amber-300 border-amber-700/50',
};

const SVC_SHORT = { 'put-out': 'Out', 'bring-in': 'In', 'both': 'Both', 'curb-items': 'Curb' };

function CalendarView({ user }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [jobs, setJobs] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const key = `${month.year}-${String(month.month + 1).padStart(2, '0')}`;
    api.get(`/servicer/jobs/calendar?month=${key}`)
      .then((res) => { setJobs(res.data.bookings || []); })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [user, month.year, month.month]);

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDay = new Date(month.year, month.month, 1).getDay();
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === month.year && today.getMonth() === month.month;

  const jobsByDay = {};
  jobs.forEach((j) => {
    const d = new Date(j.scheduledDate).getDate();
    if (!jobsByDay[d]) jobsByDay[d] = [];
    jobsByDay[d].push(j);
  });

  function prevMonth() {
    setMonth((m) => m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 });
    setSelectedDay(null);
  }
  function nextMonth() {
    setMonth((m) => m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 });
    setSelectedDay(null);
  }

  const monthLabel = new Date(month.year, month.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selectedJobs = selectedDay ? (jobsByDay[selectedDay] || []) : [];
  const selectedLabel = selectedDay
    ? new Date(month.year, month.month, selectedDay).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '';

  const MAX_PILLS = 2;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={prevMonth} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-700 active:scale-95">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h3 className="text-sm font-bold text-white">{monthLabel}</h3>
          <button onClick={nextMonth} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-700 active:scale-95">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-7 border-t border-gray-700">
          {DAYS.map((d) => (
            <div key={d} className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-500">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-t border-gray-700">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} className="min-h-[4.5rem] border-b border-r border-gray-700/50 bg-gray-900/30" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayJobs = jobsByDay[day] || [];
            const isToday = isCurrentMonth && today.getDate() === day;
            const isSelected = selectedDay === day;
            const shown = dayJobs.slice(0, MAX_PILLS);
            const overflow = dayJobs.length - MAX_PILLS;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`min-h-[4.5rem] border-b border-r border-gray-700/50 p-1 text-left transition-colors ${isSelected ? 'bg-brand-600/15' : 'hover:bg-gray-800/80'}`}
              >
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${isToday ? 'bg-brand-600 text-white' : 'text-gray-300'}`}>
                  {day}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {shown.map((j, idx) => {
                    const slug = j.serviceTypeId?.slug || '';
                    const colors = SVC_PILL_COLORS[slug] || 'bg-gray-700 text-gray-300 border-gray-600';
                    const label = SVC_SHORT[slug] || 'Svc';
                    const count = slug === 'curb-items' ? j.itemCount || 1 : slug === 'entrance-cleaning' ? j.floors || 1 : j.barrelCount || 0;
                    const completed = j.status === 'completed';
                    return (
                      <div key={idx} className={`truncate rounded border px-1 text-[9px] font-medium leading-tight ${colors} ${completed ? 'opacity-50 line-through' : ''}`}>
                        {label}{count > 0 ? ` · ${count}` : ''}
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div className="text-[9px] font-medium text-gray-500 px-0.5">+{overflow} more</div>
                  )}
                </div>
              </button>
            );
          })}
          {(() => {
            const trailing = (firstDay + daysInMonth) % 7;
            if (trailing === 0) return null;
            return Array.from({ length: 7 - trailing }).map((_, i) => (
              <div key={`t-${i}`} className="min-h-[4.5rem] border-b border-r border-gray-700/50 bg-gray-900/30" />
            ));
          })()}
        </div>
      </div>

      {loading && (
        <div className="py-8 text-center text-sm text-gray-500">Loading calendar...</div>
      )}

      {selectedDay && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-gray-500">{selectedLabel} &mdash; {selectedJobs.length} job{selectedJobs.length !== 1 ? 's' : ''}</p>
          {selectedJobs.length === 0 ? (
            <div className="rounded-xl border border-gray-700 bg-gray-800/40 py-8 text-center text-sm text-gray-500">No jobs scheduled</div>
          ) : (
            selectedJobs.map((j) => {
              const addr = j.addressId;
              const svc = j.serviceTypeId;
              const slug = svc?.slug || '';
              const count = slug === 'curb-items' ? j.itemCount || 1 : slug === 'entrance-cleaning' ? j.floors || 1 : j.barrelCount || 0;
              const unit = slug === 'curb-items' ? 'item' : slug === 'entrance-cleaning' ? 'floor' : 'barrel';
              const time = j.putOutTime || j.bringInTime || '';
              return (
                <div key={j._id} className="rounded-xl border border-gray-700 bg-gray-800 p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{svc?.name || 'Service'}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {count > 0 && <span>{count} {unit}{count !== 1 ? 's' : ''}</span>}
                        {time && <span className="mx-1">&middot; {time}</span>}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[j.status] || 'bg-gray-600 text-gray-300'}`}>{j.status}</span>
                  </div>
                  {addr && (
                    <div className="mt-2 rounded-lg bg-gray-900/50 px-3 py-2">
                      <p className="text-sm text-gray-300">{addr.street}{addr.unit ? `, ${addr.unit}` : ''}</p>
                      <p className="text-xs text-gray-500">{addr.city}, {addr.state} {addr.zip}</p>
                    </div>
                  )}
                  {['active', 'en-route', 'arrived'].includes(j.status) && (
                    <Link href={`/servicer/job/${j._id}`} className="mt-2 block rounded-lg bg-brand-600/20 py-2 text-center text-xs font-semibold text-brand-400 transition hover:bg-brand-600/30">
                      Manage Job
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const EMPTY_ICONS = {
  available: 'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0',
  active: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
  completed: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

function ServiceTypeGroup({ type, jobs, onAccept, accepting, onRate, reviewedMap, onCancel, cancelling, dark }) {
  const [open, setOpen] = useState(false);
  const totalValue = jobs.reduce((sum, b) => sum + Number(b.serviceValue ?? b.amount ?? 0), 0) * SERVICER_SHARE;

  const cardCls = dark
    ? 'rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden'
    : 'rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden';
  const btnCls = dark
    ? 'hover:bg-gray-800 active:bg-gray-700/50'
    : 'hover:bg-gray-50 active:bg-gray-100';
  const iconBg = dark ? 'bg-green-600/20' : 'bg-green-100';
  const iconColor = dark ? 'text-green-400' : 'text-green-600';
  const titleColor = dark ? 'text-white' : 'text-gray-900';
  const subColor = dark ? 'text-gray-400' : 'text-gray-500';
  const chevronColor = dark ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className={cardCls}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${btnCls}`}
      >
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
          <svg className={`h-5 w-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold truncate ${titleColor}`}>{type}</p>
          <p className={`text-xs ${subColor}`}>{jobs.length} completed &middot; ${totalValue.toFixed(2)}</p>
        </div>
        <svg className={`h-5 w-5 transition-transform duration-200 ${chevronColor} ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="space-y-3 px-3 pb-3">
          {jobs.map((b) => (
            dark
              ? <JobCard key={b._id} booking={b} onAccept={onAccept} accepting={accepting} onRate={onRate} alreadyRated={reviewedMap?.[b._id]} />
              : <BookingCard key={b._id} booking={b} onRate={onRate} alreadyRated={reviewedMap?.[b._id]} onCancel={onCancel} cancelling={cancelling} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-800 bg-gray-800/30 py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
        <svg className="h-7 w-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={EMPTY_ICONS[icon] || EMPTY_ICONS.available} />
        </svg>
      </div>
      <p className="mt-3 text-sm font-medium text-gray-400">{title}</p>
      <p className="mt-1 text-xs text-gray-600">{subtitle}</p>
    </div>
  );
}

export default function ServicerDashboard() {
  const { user, loading: authLoading, init, logout } = useAuthStore();
  const router = useRouter();
  const { unreadBump } = useNotifications();
  const { canInstall, isStandalone, isIos, hasAppStore, triggerInstall } = useInstall();
  const [tab, setTab] = useState('available');
  const [available, setAvailable] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewedMap, setReviewedMap] = useState({});
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [hasActiveRoute, setHasActiveRoute] = useState(false);
  const [hasPlannedRoute, setHasPlannedRoute] = useState(false);
  const [hasInProgressJobs, setHasInProgressJobs] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!authLoading && (!user || !['servicer', 'admin', 'superadmin'].includes(user.role))) {
      router.push('/servicer/login');
    }
  }, [authLoading, user, router]);

  async function loadUnreadCount() {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadNotifs(res.data.count || 0);
    } catch { }
  }

  useEffect(() => {
    if (!user || !['servicer', 'admin', 'superadmin'].includes(user.role)) return;
    loadJobs();
    loadMyReviews();
    loadUnreadCount();
    const interval = setInterval(() => { loadJobs(); loadUnreadCount(); }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (unreadBump > 0) loadUnreadCount();
  }, [unreadBump]);

  async function loadJobs() {
    try {
      const [avail, activeRes, doneRes, activeRouteRes, plannedRouteRes] = await Promise.all([
        api.get('/servicer/jobs/available?limit=50'),
        api.get('/servicer/jobs/mine?limit=50'),
        api.get('/servicer/jobs/mine?status=completed&limit=50&sortBy=completedAt'),
        api.get('/servicer/routes/active').catch(() => ({ data: { route: null } })),
        api.get('/servicer/routes/planned').catch(() => ({ data: { route: null } })),
      ]);
      setAvailable(avail.data.bookings);
      const activeJobs = (activeRes.data.bookings || []).filter((b) => b.status !== 'completed');
      setMyJobs([...activeJobs, ...(doneRes.data.bookings || [])]);
      const activeR = activeRouteRes.data.route;
      const plannedR = plannedRouteRes.data.route;
      const isActiveViaPlanned = !activeR && plannedR?.status === 'in-progress';
      setHasActiveRoute(!!activeR || isActiveViaPlanned);
      setHasPlannedRoute(!!plannedR && !isActiveViaPlanned);
      const inProgress = activeJobs.some((b) => ['en-route', 'arrived', 'in-progress'].includes(b.status));
      setHasInProgressJobs(inProgress && !activeR && !isActiveViaPlanned);
    } catch { }
    setLoading(false);
  }

  async function loadMyReviews() {
    try {
      const res = await api.get('/bookings/my-reviews');
      const map = {};
      (res.data.reviews || []).forEach((r) => { map[r.bookingId] = r.rating; });
      setReviewedMap(map);
    } catch { }
  }

  async function handleAccept(bookingId) {
    setAccepting(true);
    setAcceptError('');
    try {
      await api.post(`/servicer/jobs/${bookingId}/accept`);
      await loadJobs();
    } catch (err) {
      setAcceptError(err.message || 'Failed to accept job');
    }
    setAccepting(false);
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[100dvh] min-h-[100vh] w-full items-center justify-center bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const activeJobs = myJobs.filter((b) => ['active', 'en-route', 'arrived'].includes(b.status));
  const completedJobs = myJobs
    .filter((b) => b.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt));

  const cityGroups = (() => {
    const groups = {};
    available.forEach((b) => {
      const city = b.addressId?.city || 'Unknown';
      if (!groups[city]) groups[city] = [];
      groups[city].push(b);
    });
    return Object.entries(groups)
      .map(([city, jobs]) => ({
        city,
        jobs: jobs.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)),
        todayCount: jobs.filter(isDueToday).length,
      }))
      .sort((a, b) => b.todayCount - a.todayCount || b.jobs.length - a.jobs.length);
  })();

  const serviceTypeGroups = (() => {
    const groups = {};
    completedJobs.forEach((b) => {
      const name = b.serviceTypeId?.name || 'Service';
      if (!groups[name]) groups[name] = [];
      groups[name].push(b);
    });
    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([type, jobs]) => ({ type, jobs }));
  })();

  const activeTabData = activeJobs.slice(0, visibleCount);
  const hasMoreActive = activeJobs.length > visibleCount;

  function switchTab(key) {
    setTab(key);
    setVisibleCount(15);
  }

  return (
    <div className="flex min-h-[100dvh] min-h-[100vh] w-full flex-col overflow-x-hidden bg-gray-900 pb-6">
      <header className="sticky top-0 z-10 bg-gradient-to-b from-gray-800 to-gray-900 px-4 pb-3 pt-header-safe">
        <div className="flex items-center justify-between">
          <Logo size="sm" variant="wordmark" dark />
          <div className="flex items-center gap-1.5">
            <Link href="/notifications" className="relative rounded-full p-2 text-gray-400 transition hover:bg-white/10">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadNotifs > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-gray-800">
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </Link>
            <button onClick={logout} className="rounded-full p-2 text-gray-400 transition hover:bg-white/10">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          {user.profilePhotoUrl ? (
            <img src={user.profilePhotoUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-500/30" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-400 ring-2 ring-brand-500/20">{user.firstName?.[0]}{user.lastName?.[0]}</div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white truncate">{user.firstName} {user.lastName}</h1>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Servicer</span>
              <span className="text-gray-600">&middot;</span>
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${user.averageRating > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                {user.averageRating > 0 ? `${user.averageRating} (${user.totalReviews})` : 'New'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-2 px-4 mt-3">
        {activeJobs.length > 0 && (
          <Link href="/servicer/route" className={`flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white shadow-lg transition active:scale-[0.98] ${hasActiveRoute ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-green-600/25 hover:from-green-600 hover:to-green-700' : 'bg-gradient-to-r from-accent-500 to-accent-600 shadow-accent-600/25 hover:from-accent-600 hover:to-accent-700'}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            {hasActiveRoute ? 'Continue Route' : hasPlannedRoute ? 'Start Route' : hasInProgressJobs ? 'View Active Jobs' : `Plan Route (${activeJobs.length} jobs)`}
          </Link>
        )}

        <div className="flex gap-2">
          <Link href="/servicer/earnings" className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-gray-700/50 bg-gray-800/60 py-3 transition hover:bg-gray-800 active:scale-[0.98]">
            <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-xs font-medium text-gray-300">Earnings</span>
          </Link>
          <Link href="/profile" className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-gray-700/50 bg-gray-800/60 py-3 transition hover:bg-gray-800 active:scale-[0.98]">
            <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            <span className="text-xs font-medium text-gray-300">Profile</span>
          </Link>
          {!isStandalone && isIos && hasAppStore && (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-600/10 py-2">
              <AppStoreBadge height={44} />
            </div>
          )}
          {!isStandalone && canInstall && !isIos && (
            <button onClick={triggerInstall} className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-brand-500/20 bg-brand-600/10 py-3 transition hover:bg-brand-600/20 active:scale-[0.98]">
              <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className="text-xs font-medium text-brand-300">Get App</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-1 px-4">
        {[['available', `Available (${available.length})`], ['active', `My Jobs (${activeJobs.length})`], ['completed', `Done (${completedJobs.length})`], ['calendar', 'Calendar']].map(([key, label]) => (
          <button key={key} onClick={() => switchTab(key)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition ${tab === key ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25' : 'bg-gray-800/60 text-gray-400 hover:text-gray-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {acceptError && (
        <div className="mx-4 mt-3 rounded-lg bg-red-900/30 p-3 text-sm text-red-400">
          {acceptError}
          <button onClick={() => setAcceptError('')} className="ml-2 text-red-500 underline">Dismiss</button>
        </div>
      )}

      <div className="mt-3 flex-1 space-y-3 px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-500">Loading jobs...</p>
          </div>
        ) : tab === 'available' ? (
          cityGroups.length === 0 ? (
            <EmptyState icon="available" title="No available jobs right now" subtitle="New jobs will appear here when customers book" />
          ) : (
            cityGroups.map((g) => (
              <CityGroup key={g.city} city={g.city} jobs={g.jobs} onAccept={handleAccept} accepting={accepting} onRate={setReviewBooking} reviewedMap={reviewedMap} />
            ))
          )
        ) : tab === 'calendar' ? (
          <CalendarView user={user} />
        ) : tab === 'completed' ? (
          serviceTypeGroups.length === 0 ? (
            <EmptyState icon="completed" title="No completed jobs yet" subtitle="Completed jobs will show here" />
          ) : (
            serviceTypeGroups.map((g) => (
              <ServiceTypeGroup key={g.type} type={g.type} jobs={g.jobs} onRate={setReviewBooking} reviewedMap={reviewedMap} dark />
            ))
          )
        ) : activeTabData.length === 0 ? (
          <EmptyState icon="active" title="No active jobs" subtitle="Accept a job to get started" />
        ) : (
          <>
            {activeTabData.map((b) => <JobCard key={b._id} booking={b} onAccept={handleAccept} accepting={accepting} onRate={setReviewBooking} alreadyRated={reviewedMap[b._id]} />)}
            {hasMoreActive && (
              <button onClick={() => setVisibleCount((c) => c + 15)} className="w-full rounded-xl border border-gray-700 bg-gray-800/60 py-3 text-sm font-medium text-brand-400 transition hover:bg-gray-800 active:scale-[0.98]">
                Show more ({activeJobs.length - visibleCount} remaining)
              </button>
            )}
          </>
        )}
      </div>

      {reviewBooking && (
        <ReviewModal
          bookingId={reviewBooking._id}
          revieweeName={`${reviewBooking.userId?.firstName || ''} ${reviewBooking.userId?.lastName || ''}`.trim() || 'Customer'}
          onClose={() => setReviewBooking(null)}
          onSubmitted={() => { setReviewBooking(null); loadMyReviews(); loadJobs(); init(); }}
          dark
        />
      )}
    </div>
  );
}
