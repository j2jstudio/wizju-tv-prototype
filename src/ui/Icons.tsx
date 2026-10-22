const P: Record<string, string> = {
  home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4z',
  live: 'M3 7h18v12H3zM8 3l4 4 4-4',
  movies: 'M4 5h16v14H4zM4 9h16M4 15h16M8 5v4M12 5v4M16 5v4M8 15v4M12 15v4M16 15v4',
  series: 'M6 4h14v12H6zM3 8v12h14',
  favorites: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z',
  search: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5 21 21',
  settings: 'M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1',
  epg: 'M3 5h18v15H3zM3 10h18M8 5v15M3 15h18',
  play: 'M7 4l13 8-13 8z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  back10: 'M12 5a7 7 0 1 1-7 7M5 5v5h5',
  fwd30: 'M12 5a7 7 0 1 0 7 7M19 5v5h-5',
  audio: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  sub: 'M3 5h18v14H3zM6 12h5M13 12h5M6 15h8',
  quality: 'M4 6h16v12H4zM8 10v4M8 12h2M10 10v4M13 10h2a2 2 0 0 1 0 4h-2z',
  speed: 'M12 4a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9zM12 13l4-5',
  next: 'M5 5l10 7-10 7zM17 5h2v14h-2z',
  list: 'M4 6h16M4 12h16M4 18h16',
  recent: 'M12 4a8 8 0 1 1-8 8M12 8v4l3 2M4 4v4h4',
  check: 'M4 12l5 5L20 6',
  emby: 'M12 3 21 12 12 21 3 12zM10 9v6l5-3z',
  xtream: 'M4 5h16v11H4zM8 20h8M12 16v4M9 8l3 2.5L9 13',
  more: 'M5 12h.01M12 12h.01M19 12h.01M4 4h16v16H4z',
  add: 'M12 5v14M5 12h14',
  chev: 'M6 9l6 6 6-6',
};
export function Icon({ name, size = 36 }: { name: string; size?: number }) {
  const fill = name === 'play' || name === 'pause' || name === 'next' || name === 'favorites';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={fill ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d={P[name] || P.home} />
    </svg>
  );
}
