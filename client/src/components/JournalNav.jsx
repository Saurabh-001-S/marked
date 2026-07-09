import { NavLink } from 'react-router-dom';

// accountId is required; date is optional — Weekly/Monthly pages aren't date-scoped,
// so when date isn't passed we fall back to today for the Daily Log/Emotion links.
export default function JournalNav({ accountId, date }) {
  const today = date || new Date().toISOString().slice(0, 10);

  const linkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
      isActive ? 'bg-amber text-[#1A1305] font-semibold' : 'text-gray-400 hover:text-white'
    }`;

  return (
    <div className="flex items-center gap-2">
      <NavLink to={`/journal/${accountId}/${today}`} end className={linkClass}>Daily Log</NavLink>
      <NavLink to={`/journal/${accountId}/${today}/emotion`} className={linkClass}>Emotion</NavLink>
      <NavLink to={`/journal/${accountId}/weekly`} className={linkClass}>Weekly</NavLink>
      <NavLink to={`/journal/${accountId}/monthly`} className={linkClass}>Monthly</NavLink>
    </div>
  );
}
