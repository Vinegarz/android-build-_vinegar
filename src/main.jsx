import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Search, SearchX, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  MoreHorizontal, ListMusic, X, Home, Clock3, Heart, PanelLeftClose,
  PanelLeftOpen, Shuffle, Trash2, GripVertical, Library, Upload, Plus,
  RefreshCw, Music2, ListPlus, PlayCircle, ChevronDown, ChevronUp, Maximize2,
  Repeat2, Download, CheckCircle2, ArrowRight, Grid2X2, List, Sparkles, Radio, Headphones, WandSparkles
} from "lucide-react";
import "./styles.css";
import "./mobile.css";
import MobilePlayer from "./MobilePlayer";

const API_BASE = "http://localhost:8787";

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch { return fallback; }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function useMedia(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const m = window.matchMedia(query);
    const fn = () => setMatches(m.matches);
    fn();
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, [query]);
  return matches;
}

function App() {
  const isMobile = useMedia("(max-width: 900px)");
  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const ytReadyRef = useRef(false);
  const playNextRef = useRef(null);
  const autoPlayRef = useRef(true);

  const [page, setPage] = useState("home");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [queue, setQueue] = useState(() => readStorage("vinegar-queue", []));
  const [selected, setSelected] = useState(() => readStorage("vinegar-selected", null));
  const [recent, setRecent] = useState(() => readStorage("vinegar-recent", []));
  const [favorites, setFavorites] = useState(() => readStorage("vinegar-favorites", []));
  const [playlists, setPlaylists] = useState(() => readStorage("vinegar-playlists", []));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [queueOpen, setQueueOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [importing, setImporting] = useState(false);
  const [menu, setMenu] = useState(null);
  const [playlistPicker, setPlaylistPicker] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [publicPlaylists, setPublicPlaylists] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [libraryView, setLibraryView] = useState("grid");
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (window.YT?.Player) {
      ytReadyRef.current = true;
      return;
    }
    const old = window.onYouTubeIframeAPIReady;
    const ready = () => {
      ytReadyRef.current = true;
      setPlayerReady(false);
      if (typeof old === "function") old();
    };
    window.onYouTubeIframeAPIReady = ready;
    let script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.body.appendChild(script);
    }
    return () => {
      if (window.onYouTubeIframeAPIReady === ready) window.onYouTubeIframeAPIReady = old;
    };
  }, []);

  useEffect(() => { playNextRef.current = playNext; });

  useEffect(() => {
    if (!selected?.id || !ytReadyRef.current || !window.YT?.Player || !playerContainerRef.current) return;
    if (playerRef.current) {
      autoPlayRef.current = true;
      try { playerRef.current.loadVideoById(selected.id); } catch {}
      return;
    }
    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      width: "1", height: "1", videoId: selected.id,
      playerVars: {
        autoplay: 0, controls: 0, disablekb: 1, fs: 0, playsinline: 1,
        rel: 0, modestbranding: 1, iv_load_policy: 3, origin: window.location.origin
      },
      events: {
        onReady: e => {
          setPlayerReady(true);
          if (autoPlayRef.current) e.target.playVideo();
        },
        onStateChange: e => {
          if (e.data === window.YT.PlayerState.PLAYING) {
            setPlaying(true); setPlayerReady(true);
          } else if (e.data === window.YT.PlayerState.PAUSED) {
            setPlaying(false); setPlayerReady(true);
          } else if (e.data === window.YT.PlayerState.BUFFERING) {
            setPlayerReady(true);
          } else if (e.data === window.YT.PlayerState.ENDED) {
            setPlaying(false);
            setTimeout(() => playNextRef.current?.(), 100);
          }
        },
        onError: e => console.error("Vinegar YouTube error:", e.data)
      }
    });
    return () => {};
  }, [selected?.id]);

  useEffect(() => () => {
    try { playerRef.current?.destroy(); } catch {}
    playerRef.current = null;
  }, []);

  useEffect(() => writeStorage("vinegar-queue", queue), [queue]);
  useEffect(() => writeStorage("vinegar-selected", selected), [selected]);
  useEffect(() => writeStorage("vinegar-recent", recent), [recent]);
  useEffect(() => writeStorage("vinegar-favorites", favorites), [favorites]);
  useEffect(() => writeStorage("vinegar-playlists", playlists), [playlists]);

  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p || !playerReady) return;
      try {
        const d = Number(p.getDuration?.()) || 0;
        const t = Number(p.getCurrentTime?.()) || 0;
        setDuration(d); setProgress(t);
      } catch {}
    }, 500);
    return () => clearInterval(id);
  }, [playerReady, selected?.id]);

  function seekTo(value) {
    const p = playerRef.current;
    if (!p || !playerReady || !duration) return;
    const time = Number(value);
    try { p.seekTo(time, true); setProgress(time); } catch {}
  }

  function formatTime(value) {
    const v = Math.max(0, Math.floor(Number(value) || 0));
    return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
  }

  const currentIndex = selected ? queue.findIndex(s => s.id === selected.id) : -1;

  function addRecent(song) {
    setRecent(old => [song, ...old.filter(s => s.id !== song.id)].slice(0, 50));
  }

  // Playing a song NEVER adds it to the queue.
  function playSong(song) {
    if (!song) return;
    setSelected(song);
    setPlaying(false);
    setMuted(false);
    addRecent(song);
    setExpanded(false);
    setMenu(null);
  }

  function showToast(message, tone = "default") {
    setToast({ message, tone, id: Date.now() });
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(null), 1800);
  }

  function addToQueue(song) {
    if (!song) return;
    let added = false;
    setQueue(old => {
      if (old.some(s => s.id === song.id)) return old;
      added = true;
      return [...old, song].slice(0, 100);
    });
    showToast(added ? "Added to queue" : "Already in queue", added ? "queue" : "default");
    setMenu(null);
  }

  function playNextSong(song) {
    if (!song) return;
    setQueue(old => {
      const rest = old.filter(s => s.id !== song.id && s.id !== selected?.id);
      const current = selected ? old.find(s => s.id === selected.id) : null;
      return current ? [current, song, ...rest].slice(0, 100) : [song, ...rest].slice(0, 100);
    });
    showToast("Added as next track", "queue");
    setMenu(null);
  }

  function playNext() {
    if (!queue.length) return;
    if (shuffle) {
      const options = queue.filter(s => s.id !== selected?.id);
      if (options.length) playSong(options[Math.floor(Math.random() * options.length)]);
      return;
    }
    if (currentIndex >= 0 && currentIndex < queue.length - 1) playSong(queue[currentIndex + 1]);
  }

  function playPrevious() {
    if (currentIndex > 0) playSong(queue[currentIndex - 1]);
  }

  function togglePlay() {
    const p = playerRef.current;
    if (!p || !playerReady) return;
    try {
      if (p.getPlayerState() === window.YT.PlayerState.PLAYING) {
        autoPlayRef.current = false; p.pauseVideo();
      } else {
        autoPlayRef.current = true; p.playVideo();
      }
    } catch {}
  }

  function toggleMute() {
    const p = playerRef.current;
    if (!p || !playerReady) return;
    try {
      if (muted) { p.unMute(); setMuted(false); }
      else { p.mute(); setMuted(true); }
    } catch {}
  }

  function isFavorite(song) {
    return favorites.some(s => s.id === song?.id);
  }
  function toggleFavorite(song) {
    if (!song) return;
    const wasFavorite = isFavorite(song);
    setFavorites(old => old.some(s => s.id === song.id)
      ? old.filter(s => s.id !== song.id)
      : [song, ...old]);
    showToast(wasFavorite ? "Removed from liked songs" : "Added to liked songs", "like");
    setMenu(null);
  }

  async function search(e) {
    e?.preventDefault();

    const term = query.trim().replace(/\s+/g, " ");
    if (!term) return;

    setLoading(true);
    setError("");
    setPage("search");

    try {
      const endpoint =
        `${API_BASE}/api/search?q=${encodeURIComponent(term)}`;

      const r = await fetch(endpoint, {
        headers: { Accept: "application/json" }
      });

      const contentType = r.headers.get("content-type") || "";
      const raw = await r.text();

      let data = null;

      if (contentType.includes("application/json")) {
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          throw new Error("The search server returned invalid JSON.");
        }
      } else {
        const preview = raw.trim().slice(0, 80).replace(/\s+/g, " ");

        if (preview.toLowerCase().startsWith("<!doctype") ||
            preview.toLowerCase().startsWith("<html")) {
          throw new Error(
            `Search API misconfigured: ${API_BASE} returned HTML instead of JSON. ` +
            `Make sure the Vinegar backend (index.js) is running on port 8787.`
          );
        }

        throw new Error(
          `Search API returned an unexpected response (${r.status} ${r.statusText}).`
        );
      }

      if (!r.ok) {
        throw new Error(data?.error || `Search failed (${r.status}).`);
      }

      setResults(Array.isArray(data?.results) ? data.results : []);
    } catch (err) {
      setResults([]);
      setError(err?.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  function clearQueue() {
    setQueue([]); setSelected(null); setPlaying(false);
  }
  function removeFromQueue(id) {
    setQueue(old => old.filter(s => s.id !== id));
    if (selected?.id === id) setSelected(null);
  }
  function toggleShuffle() { setShuffle(v => !v); }

  function createPlaylist() {
    const name = prompt("Playlist name:");
    if (!name?.trim()) return;
    setPlaylists(old => [...old, {
      id: crypto.randomUUID(), name: name.trim(), songs: [], createdAt: Date.now(), source: "local"
    }]);
    setPage("library");
  }

  function addToPlaylist(song, playlistId) {
    let added = false;
    setPlaylists(old => old.map(p => {
      if (p.id !== playlistId) return p;
      if (p.songs.some(s => s.id === song.id)) return p;
      added = true;
      return { ...p, songs: [...p.songs, song] };
    }));
    showToast(added ? "Added to playlist" : "Already in playlist", "playlist");
    setPlaylistPicker(null);
    setMenu(null);
  }

  function saveQueueAsPlaylist() {
    if (!queue.length) return;
    const name = prompt("Playlist name:");
    if (!name?.trim()) return;
    setPlaylists(old => [...old, {
      id: crypto.randomUUID(), name: name.trim(), songs: [...queue], createdAt: Date.now(), source: "local"
    }]);
  }

  function openPlaylist(p) {
    if (!p) return;
    setActivePlaylist(p);
    setPage("playlist");
  }

  function playPlaylist(p, startSong = null) {
    if (!p?.songs?.length) return;
    setQueue(p.songs);
    playSong(startSong || p.songs[0]);
  }

  async function openPublicPlaylist(playlist) {
    setSuggestionsLoading(true); setError("");
    try {
      const r = await fetch(`${API_BASE}/api/playlist?url=${encodeURIComponent(playlist.id)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Playlist could not be loaded.");
      openPlaylist({ ...playlist, songs: data.results || [], source: "public" });
    } catch (err) {
      setError(err.message || "Playlist could not be loaded.");
    } finally { setSuggestionsLoading(false); }
  }

  async function loadPublicPlaylists() {
    if (publicPlaylists.length || suggestionsLoading) return;
    setSuggestionsLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/suggestions`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not load suggestions.");
      setPublicPlaylists(data.results || []);
    } catch (err) {
      setError(err.message || "Could not load suggestions.");
    } finally { setSuggestionsLoading(false); }
  }

  useEffect(() => { loadPublicPlaylists(); }, []);

  function deletePlaylist(id) {
    setPlaylists(old => old.filter(p => p.id !== id));
  }

  async function importYouTubePlaylist(urlValue = "") {
    const url = String(urlValue || "").trim();
    if (!url) {
      setImportOpen(true);
      return;
    }
    setImporting(true); setError("");
    try {
      const r = await fetch(`${API_BASE}/api/playlist?url=${encodeURIComponent(url)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Playlist import failed.");
      const songs = data.results || [];
      if (!songs.length) throw new Error("No accessible songs were found.");
      const suggestedName = data.title || "Imported Playlist";
      const name = prompt("Playlist name:", suggestedName);
      if (!name?.trim()) return;
      setPlaylists(old => [...old, {
        id: crypto.randomUUID(), name: name.trim(), songs, createdAt: Date.now(),
        source: "youtube", sourceUrl: url, youtubePlaylistId: data.playlistId
      }]);
      setImportOpen(false); setImportUrl(""); setPage("library");
    } catch (err) {
      setError(err.message || "Playlist import failed.");
    } finally { setImporting(false); }
  }

  const nav = [
    ["home", "Home", Home],
    ["search", "Search", Search],
    ["recent", "Recent", Clock3],
    ["library", "Library", Library]
  ];

  return (
    <div className="vinegar-app" onClick={() => menu && setMenu(null)}>
      <div ref={playerContainerRef} className="yt-hidden-player" />

      {!isMobile && (
        <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
          <div className="vinegar-logo">
            <div className="vinegar-symbol">V</div>
            {sidebarOpen && <span>VINEGAR</span>}
          </div>

          <nav className="side-nav">
            {nav.map(([id, label, Icon]) => (
              <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}>
                <Icon size={18}/>{sidebarOpen && <span>{label}</span>}
              </button>
            ))}
          </nav>

          {sidebarOpen && (
            <>
              <div className="side-label">YOUR LIBRARY</div>
              <button className="side-playlist-btn" onClick={createPlaylist}><Plus size={16}/> New playlist</button>
              {playlists.slice(0, 7).map(p => (
                <button className="side-playlist" key={p.id} onClick={() => openPlaylist(p)}>
                  <Music2 size={15}/><span>{p.name}</span>
                </button>
              ))}
            </>
          )}

          <button className="collapse-btn" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? <PanelLeftClose size={18}/> : <PanelLeftOpen size={18}/>}
          </button>
        </aside>
      )}

      <main className="content">
        <header className="topbar">
          {isMobile && <div className="mobile-logo"><div className="vinegar-symbol">V</div><b>VINEGAR</b></div>}
          {isMobile ? (
            <button
              type="button"
              className="top-search mobile-search-trigger"
              onClick={() => setPage("search")}
              aria-label="Open search"
            >
              <Search size={18}/>
              <span>Search</span>
            </button>
          ) : (
            <form className="top-search" onSubmit={search}>
              <Search size={18}/>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search songs, artists, albums..." />
              {query && <button type="button" onClick={() => setQuery("")}><X size={15}/></button>}
            </form>
          )}
          {!isMobile && <button className="queue-top" onClick={() => setQueueOpen(true)}><ListMusic size={17}/> Queue <b>{queue.length}</b></button>}
        </header>

        <div className="content-scroll">
          {page === "home" && (
            <section className="content-section home-page">
              <section className="home-hero">
                <div className="home-hero-copy">
                  <span className="eyebrow">GOOD EVENING 👋</span>
                  <h1>What’s on <em>your mind?</em></h1>
                  <p>Find a song, chase a mood, or discover something completely new.</p>
                </div>
                <div className="home-orb" aria-hidden="true">
                  <div className="orb-ring ring-one"/>
                  <div className="orb-ring ring-two"/>
                  <div className="orb-center"><Headphones size={42}/></div>
                </div>
              </section>

              <section className="home-section home-shortcuts">
                <button onClick={() => setPage("recent")}><Clock3/><span><b>Recently played</b><small>{recent.length} songs</small></span></button>
                <button onClick={() => setPage("library")}><Heart/><span><b>Liked Songs</b><small>{favorites.length} favorites</small></span></button>
                <button onClick={() => setPage("library")}><Library/><span><b>Your library</b><small>{playlists.length} playlists</small></span></button>
                <button onClick={() => publicPlaylists.length ? openPublicPlaylist(publicPlaylists[0]) : loadPublicPlaylists()}><Radio/><span><b>Discover</b><small>Public playlists</small></span></button>
              </section>

              {recent.length > 0 && (
                <section className="home-section">
                  <div className="home-section-title"><div><span className="eyebrow">FOR YOU</span><h2>Continue listening</h2></div><button className="text-btn" onClick={() => setPage("recent")}>See all <ArrowRight size={15}/></button></div>
                  <div className="continue-grid">
                    {recent.slice(0, 4).map(song => (
                      <button className="continue-card" key={song.id} onClick={() => playSong(song)}>
                        <img src={song.thumbnail} alt=""/>
                        <div className="continue-overlay"><Play size={22} fill="currentColor"/></div>
                        <div className="continue-info"><b>{song.title}</b><span>{song.channel}</span></div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="home-section">
                <div className="home-section-title"><div><span className="eyebrow">EXPLORE</span><h2>Discover playlists</h2></div><button className="text-btn" onClick={() => { setPublicPlaylists([]); loadPublicPlaylists(); }} disabled={suggestionsLoading}><RefreshCw size={15} className={suggestionsLoading ? "spin" : ""}/> Refresh</button></div>
                <div className="discover-playlists">
                  {publicPlaylists.slice(0, 8).map((playlist, i) => (
                    <button key={playlist.id} className="discover-card" onClick={() => openPublicPlaylist(playlist)}>
                      <div className="discover-cover">{playlist.thumbnail ? <img src={playlist.thumbnail} alt=""/> : <Music2 size={34}/>}<div className="discover-play"><Play size={20} fill="currentColor"/></div></div>
                      <span className="discover-number">{String(i + 1).padStart(2, "0")}</span><b>{playlist.title}</b><small>{playlist.channel || "Public playlist"}</small>
                    </button>
                  ))}
                  {!suggestionsLoading && !publicPlaylists.length && <div className="small-empty">No public playlists available right now.</div>}
                </div>
              </section>

              {favorites.length > 0 && (
                <section className="home-section">
                  <div className="home-section-title"><div><span className="eyebrow">FROM YOUR LIBRARY</span><h2>Your quick picks</h2></div><button className="text-btn" onClick={() => setPage("library")}>Open library <ArrowRight size={15}/></button></div>
                  <div className="quick-picks">
                    {favorites.slice(0, 6).map((song, index) => <button key={song.id} className="quick-pick" onClick={() => playSong(song)}><span>{String(index + 1).padStart(2, "0")}</span><img src={song.thumbnail} alt=""/><div><b>{song.title}</b><small>{song.channel}</small></div><Play size={17} fill="currentColor"/></button>)}
                  </div>
                </section>
              )}
            </section>
          )}

          {page === "search" && (
            <section className="content-section search-page">
              <div className="page-title">
                <div>
                  <span>SEARCH</span>
                  <h1>Search music</h1>
                </div>
              </div>

              <form className="search-page-box" onSubmit={search}>
                <Search size={20}/>
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Songs, artists, albums..."
                />
                {query && (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => {
                      setQuery("");
                      setResults([]);
                      setError("");
                    }}
                    aria-label="Clear search"
                  >
                    <X size={18}/>
                  </button>
                )}
                <button
                  type="submit"
                  className="search-page-submit"
                  disabled={!query.trim() || loading}
                  aria-label="Search"
                >
                  {loading ? <RefreshCw size={18} className="spin"/> : <ArrowRight size={18}/>}
                </button>
              </form>

              {loading && (
                <div className="search-state">
                  <RefreshCw size={28} className="spin"/>
                  <p>Finding the best matches for you...</p>
                </div>
              )}

              {error && (
                <div className="search-state error-state">
                  <SearchX size={30}/>
                  <div>
                    <h3>Couldn't complete the search</h3>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {!loading && !error && results.length > 0 && (
                <SongSection
                  title={`Results for “${query}”`}
                  songs={results}
                  selected={selected}
                  onPlay={playSong}
                  onQueue={addToQueue}
                  onNext={playNextSong}
                  onFavorite={toggleFavorite}
                  onPlaylist={setPlaylistPicker}
                />
              )}

              {!loading && !error && query && !results.length && (
                <Empty icon={Search} text="No songs found. Try a different search."/>
              )}

              {!loading && !error && !query && !results.length && (
                <Empty icon={Search} text="Search for songs, artists, or albums."/>
              )}
            </section>
          )}

          {page === "recent" && (
            <section className="content-section">
              <div className="page-title row-title"><div><span>HISTORY</span><h1>Recently played</h1></div>
                {recent.length > 0 && <button className="text-btn" onClick={() => setRecent([])}>Clear</button>}
              </div>
              <SongSection title="" songs={recent} selected={selected} onPlay={playSong} onQueue={addToQueue} onNext={playNextSong} onFavorite={toggleFavorite} onPlaylist={setPlaylistPicker}/>
              {!recent.length && <Empty icon={Clock3} text="Nothing here yet."/>}
            </section>
          )}


          {page === "playlist" && activePlaylist && (
            <section className="content-section playlist-page">
              <div className="playlist-hero">
                <div className="playlist-cover">
                  {activePlaylist.songs?.[0]?.thumbnail ? <img src={activePlaylist.songs[0].thumbnail} alt=""/> : <Music2 size={42}/>}
                </div>
                <div className="playlist-info">
                  <span>{activePlaylist.source === "public" ? "PUBLIC PLAYLIST" : "YOUR PLAYLIST"}</span>
                  <h1>{activePlaylist.name || activePlaylist.title}</h1>
                  <p>{activePlaylist.channel || "Your Vinegar library"} · {activePlaylist.songs?.length || 0} songs</p>
                  <div className="playlist-actions">
                    <button className="playlist-play" onClick={() => playPlaylist(activePlaylist)} disabled={!activePlaylist.songs?.length}><Play size={18} fill="currentColor"/> Play</button>
                    <button className="outline-btn" onClick={() => { setQueue(activePlaylist.songs || []); }}>Add to queue</button>
                    {activePlaylist.source === "public" && <button className="outline-btn" onClick={() => setPlaylists(old => old.some(p => p.youtubePlaylistId === activePlaylist.id) ? old : [...old, { ...activePlaylist, id: crypto.randomUUID(), name: activePlaylist.title, youtubePlaylistId: activePlaylist.id, source: "youtube", createdAt: Date.now() }])}>Save to library</button>}
                  </div>
                </div>
              </div>
              <SongSection title="Songs" songs={activePlaylist.songs || []} selected={selected} onPlay={song => playPlaylist(activePlaylist, song)} onQueue={addToQueue} onNext={playNextSong} onFavorite={toggleFavorite} onPlaylist={setPlaylistPicker}/>
              {!activePlaylist.songs?.length && <Empty icon={Music2} text="This playlist has no accessible songs."/>}
            </section>
          )}

          {page === "library" && (
            <section className="content-section library-page">
              <div className="library-hero">
                <div>
                  <span className="eyebrow">YOUR COLLECTION</span>
                  <h1>Library</h1>
                  <p>Your music, all in one place.</p>
                </div>
                <div className="head-actions library-actions">
                  <button className="primary-btn" onClick={createPlaylist}><Plus size={17}/> New playlist</button>
                  <button className="outline-btn" onClick={() => setImportOpen(true)} disabled={importing}>
                    {importing ? <RefreshCw className="spin" size={16}/> : <Upload size={16}/>} Import playlist
                  </button>
                </div>
              </div>

              <div className="library-block liked-block">
                <div className="block-head library-section-head">
                  <div><h2><Heart size={18} fill={favorites.length ? "currentColor" : "none"}/> Liked Songs</h2><p>Songs you've liked</p></div>
                  <div className="section-tools"><span>{favorites.length} songs</span>{favorites.length > 8 && <button onClick={() => setShowAllFavorites(v => !v)}>{showAllFavorites ? "Show less" : <>View all <ArrowRight size={14}/></>}</button>}</div>
                </div>
                {favorites.length ? <SongSection title="" songs={(showAllFavorites ? favorites : favorites.slice(0, 8))} selected={selected} onPlay={playSong} onQueue={addToQueue} onNext={playNextSong} onFavorite={toggleFavorite} onPlaylist={setPlaylistPicker}/> : (
                  <div className="liked-empty"><div className="liked-empty-icon"><Heart size={22}/></div><b>Start building your liked songs</b><span>Tap the heart on any track and it will live here.</span><button className="outline-btn" onClick={() => setPage("home")}><Search size={15}/> Find music</button></div>
                )}
              </div>

              <div className="library-block playlists-block">
                <div className="block-head library-section-head">
                  <div><h2><ListMusic size={18}/> Playlists</h2><p>{playlists.length ? "Your saved playlists" : "Create a playlist or bring one in from YouTube"}</p></div>
                  <div className="playlist-toolbar">
                    <button className="view-toggle" onClick={() => setLibraryView("grid")} aria-label="Grid view"><Grid2X2 size={16}/></button>
                    <button className="view-toggle" onClick={() => setLibraryView("list")} aria-label="List view"><List size={17}/></button>
                    <button className="primary-text-btn" onClick={createPlaylist}><Plus size={16}/> New playlist</button>
                  </div>
                </div>
                {playlists.length ? <div className={`playlist-grid ${libraryView === "list" ? "playlist-list-view" : ""}`}>
                  {playlists.map(p => (
                    <div className="playlist-card" key={p.id}>
                      <button className="playlist-card-main" onClick={() => openPlaylist(p)}>
                        <div className="playlist-card-art">
                          {p.songs?.[0]?.thumbnail ? <img src={p.songs[0].thumbnail} alt=""/> : <Music2 size={30}/>}
                          <span className="playlist-card-play"><Play size={16} fill="currentColor"/></span>
                        </div>
                        <div className="playlist-card-copy"><b>{p.name}</b><small>{p.songs?.length || 0} songs · {p.source === "youtube" ? "Imported" : "Vinegar playlist"}</small></div>
                      </button>
                      <div className="playlist-card-actions">
                        <button title="Play playlist" onClick={() => playPlaylist(p)}><Play size={15} fill="currentColor"/></button>
                        <button title="Delete playlist" onClick={() => deletePlaylist(p.id)}><Trash2 size={15}/></button>
                      </div>
                    </div>
                  ))}
                </div> : (
                  <div className="playlist-empty">
                    <div><Sparkles size={21}/></div><b>Your playlist shelf is empty</b><span>Create one from scratch or import a public YouTube playlist.</span>
                    <div><button className="primary-btn" onClick={createPlaylist}><Plus size={16}/> New playlist</button><button className="outline-btn" onClick={() => setImportOpen(true)}><Upload size={16}/> Import playlist</button></div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {!isMobile && (
        <aside className="right-panel">
          <div className="right-head"><div><span>NOW PLAYING</span><h2>Listening</h2></div>
            <button title="Open queue" onClick={() => setQueueOpen(true)}><ListMusic size={18}/></button>
          </div>
          <div className="now-card">
            {selected ? <>
              <button className="now-art-button" onClick={() => setExpanded(true)}><img src={selected.thumbnail} alt="Current track artwork"/></button>
              <div className="now-title-row"><div><b>{selected.title}</b><span>{selected.channel}</span></div>
                <button className={isFavorite(selected) ? "favorite-active" : ""} onClick={() => toggleFavorite(selected)}><Heart size={19}/></button>
              </div>
              <div className="side-timeline">
                <input type="range" min="0" max={Math.max(duration, 1)} value={Math.min(progress, Math.max(duration, 1))} onChange={e => seekTo(e.target.value)} />
                <div><span>{formatTime(progress)}</span><span>{formatTime(duration)}</span></div>
              </div>
              <div className="side-player-controls">
                <button onClick={playPrevious}><SkipBack size={19} fill="currentColor"/></button>
                <button className="side-play" onClick={togglePlay} disabled={!playerReady}>{playing ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}</button>
                <button onClick={playNext}><SkipForward size={19} fill="currentColor"/></button>
              </div>
              <button className="expand-player-btn" onClick={() => setExpanded(true)}><Maximize2 size={16}/> Expand player</button>
            </> : <div className="no-song"><Music2 size={28}/><span>Nothing playing</span></div>}
          </div>
        </aside>
      )}

      {selected && (
        <>
          <div className="bottom-player desktop-player">
            <div className="player-left">
              <button className="player-song" onClick={() => setExpanded(true)}>
                <img src={selected.thumbnail} alt=""/>
                <div><b>{selected.title}</b><span>{selected.channel}</span></div>
              </button>
              <button
                className={isFavorite(selected) ? "favorite-active player-like" : "player-like"}
                title="Like song"
                onClick={() => toggleFavorite(selected)}
              ><Heart size={18}/></button>
            </div>

            <div className="player-center">
              <div className="player-controls">
                <button className={shuffle ? "selected-control" : ""} onClick={toggleShuffle} title="Shuffle"><Shuffle size={16}/></button>
                <button onClick={playPrevious} title="Previous"><SkipBack size={18} fill="currentColor"/></button>
                <button className="player-play" onClick={togglePlay} disabled={!playerReady} title={playing ? "Pause" : "Play"}>
                  {playing ? <Pause size={19} fill="currentColor"/> : <Play size={19} fill="currentColor"/>}
                </button>
                <button onClick={playNext} title="Next"><SkipForward size={18} fill="currentColor"/></button>
                <button title="Repeat"><Repeat2 size={16}/></button>
              </div>

              <div className="bottom-timeline">
                <span>{formatTime(progress)}</span>
                <input
                  aria-label="Song progress"
                  type="range"
                  min="0"
                  max={Math.max(duration, 1)}
                  value={Math.min(progress, Math.max(duration, 1))}
                  onChange={e => seekTo(e.target.value)}
                />
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="player-extra">
              <button onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button>
              <button onClick={() => setQueueOpen(true)} title="Open queue"><ListMusic size={18}/></button>
              <button title="Expand player" onClick={() => setExpanded(true)}><ChevronUp size={19}/></button>
            </div>
          </div>

          {expanded && (
            <div className="expanded-player">
              <button className="expand-close" onClick={() => setExpanded(false)}><ChevronDown size={21}/></button>
              <button className="expanded-art" onClick={() => setExpanded(false)}><img src={selected.thumbnail} alt=""/></button>
              <span>NOW PLAYING</span><h2>{selected.title}</h2><p>{selected.channel}</p>
              <div className="expanded-timeline">
                <input type="range" min="0" max={Math.max(duration, 1)} value={Math.min(progress, Math.max(duration, 1))} onChange={e => seekTo(e.target.value)} />
                <div><span>{formatTime(progress)}</span><span>{formatTime(duration)}</span></div>
              </div>
              <div className="expanded-controls">
                <button onClick={playPrevious}><SkipBack/></button>
                <button onClick={togglePlay} disabled={!playerReady}>{playing ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button>
                <button onClick={playNext}><SkipForward/></button>
              </div>
              <div className="expanded-actions">
                <button className={shuffle ? "selected-control" : ""} onClick={toggleShuffle}><Shuffle size={18}/></button>
                <button onClick={toggleMute}>{muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button>
                <button className={isFavorite(selected) ? "selected-control" : ""} onClick={() => toggleFavorite(selected)}><Heart size={18}/></button>
                <button onClick={() => setQueueOpen(true)}><ListMusic size={18}/></button>
              </div>
            </div>
          )}

          <MobilePlayer
            isMobile={isMobile}
            song={selected}
            playing={playing}
            playerReady={playerReady}
            progress={progress}
            duration={duration}
            muted={muted}
            isFavorite={isFavorite(selected)}
            onTogglePlay={togglePlay}
            onPrevious={playPrevious}
            onNext={playNext}
            onSeek={seekTo}
            onToggleMute={toggleMute}
            onToggleFavorite={() => toggleFavorite(selected)}
            onOpenQueue={() => setQueueOpen(true)}
            formatTime={formatTime}
          />
        </>
      )}

      {isMobile && (
        <nav className="mobile-nav">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              className={page === id ? "active" : ""}
              onClick={() => setPage(id)}
            >
              <Icon size={18}/>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      {importOpen && (
        <div className="modal-backdrop import-backdrop" onClick={() => !importing && setImportOpen(false)}>
          <div className="import-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => !importing && setImportOpen(false)}><X size={18}/></button>
            <div className="import-icon"><Download size={23}/></div>
            <span className="eyebrow">IMPORT PLAYLIST</span>
            <h2>Bring your music into Vinegar</h2>
            <p>Paste a public YouTube or YouTube Music playlist link. We'll fetch the accessible tracks and add it to your library.</p>
            <form onSubmit={e => { e.preventDefault(); importYouTubePlaylist(importUrl); }}>
              <label>Playlist link</label>
              <div className="import-input"><input autoFocus value={importUrl} onChange={e => setImportUrl(e.target.value)} placeholder="https://youtube.com/playlist?list=..." /><button type="button" onClick={() => setImportUrl("")}><X size={16}/></button></div>
              <button className="primary-btn import-submit" disabled={!importUrl.trim() || importing}>{importing ? <><RefreshCw className="spin" size={16}/> Importing…</> : <><Download size={16}/> Import playlist</>}</button>
            </form>
            <div className="import-note"><CheckCircle2 size={15}/> Public playlists only · Your existing library stays untouched</div>
          </div>
        </div>
      )}

      {queueOpen && (
        <div className="modal-backdrop" onClick={() => setQueueOpen(false)}>
          <aside className="queue-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-head"><div><span>UP NEXT</span><h2>Queue</h2></div><button onClick={() => setQueueOpen(false)}><X/></button></div>
            <div className="drawer-actions"><button onClick={toggleShuffle} className={shuffle ? "active" : ""}><Shuffle size={15}/> Shuffle</button><button onClick={saveQueueAsPlaylist} disabled={!queue.length}><Library size={15}/> Save</button><button onClick={clearQueue} disabled={!queue.length}><Trash2 size={15}/> Clear</button></div>
            {queue.map((song, i) => <QueueRow key={`${song.id}-${i}`} song={song} active={selected?.id === song.id} onPlay={s => {playSong(s); setQueueOpen(false)}} onRemove={removeFromQueue}/>)}
            {!queue.length && <Empty icon={ListMusic} text="Your queue is empty."/>}
          </aside>
        </div>
      )}

      {menu && (
        <div className="song-menu" style={{left: menu.x, top: menu.y}} onClick={e => e.stopPropagation()}>
          <button onClick={() => playSong(menu.song)}><PlayCircle size={16}/> Play</button>
          <button onClick={() => playNextSong(menu.song)}><SkipForward size={16}/> Play next</button>
          <button onClick={() => addToQueue(menu.song)}><ListPlus size={16}/> Add to queue</button>
          <button onClick={() => {setPlaylistPicker(menu.song); setMenu(null)}}><Library size={16}/> Add to playlist</button>
          <button onClick={() => toggleFavorite(menu.song)}><Heart size={16}/> {isFavorite(menu.song) ? "Remove favorite" : "Add to favorites"}</button>
        </div>
      )}

      {toast && (
        <div key={toast.id} className={`action-toast ${toast.tone}`}>
          <CheckCircle2 size={17}/><span>{toast.message}</span>
        </div>
      )}

      {playlistPicker && (
        <div className="modal-backdrop" onClick={() => setPlaylistPicker(null)}>
          <div className="playlist-picker" onClick={e => e.stopPropagation()}>
            <div className="drawer-head"><div><span>SAVE SONG</span><h2>Add to playlist</h2></div><button onClick={() => setPlaylistPicker(null)}><X/></button></div>
            {playlists.map(p => <button className="picker-row" key={p.id} onClick={() => addToPlaylist(playlistPicker, p.id)}><Library size={17}/><span>{p.name}</span></button>)}
            {!playlists.length && <div className="small-empty">Create a playlist first.</div>}
            <button className="outline-btn full" onClick={createPlaylist}><Plus size={16}/> New playlist</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SongSection({title, songs, selected, onPlay, onQueue, onNext, onFavorite, onPlaylist}) {
  return <div className="song-section">
    {title && <h2 className="section-label">{title}</h2>}
    {songs.map((song, i) => <SongRow key={`${song.id}-${i}`} song={song} selected={selected?.id === song.id} onPlay={onPlay} onQueue={onQueue} onNext={onNext} onFavorite={onFavorite} onPlaylist={onPlaylist}/>)}
  </div>;
}
function SongRow({song, selected, onPlay, onQueue, onNext, onFavorite, onPlaylist}) {
  const [open, setOpen] = useState(false);
  const [queued, setQueued] = useState(false);

  function closeThen(action) {
    action();
    setOpen(false);
  }

  return <div className={`song-row ${selected ? "selected" : ""}`}>
    <button className="song-main" onClick={() => onPlay(song)}>
      <img src={song.thumbnail} alt=""/>
      <span className="song-index">
        {selected ? <Pause size={13} fill="currentColor"/> : <Play size={12} fill="currentColor"/>}
      </span>
      <div><b>{song.title}</b><span>{song.channel}</span></div>
    </button>

    <div className="row-actions">
      <button
        className={queued ? "action-confirmed queue-confirmed" : ""}
        title={queued ? "Added to queue" : "Add to queue"}
        onClick={() => {
          onQueue(song);
          setQueued(true);
          window.setTimeout(() => setQueued(false), 1400);
        }}
      >
        {queued ? <CheckCircle2 size={17}/> : <Plus size={17}/>}
      </button>

      <div className="song-menu-wrap">
        <button
          className={open ? "menu-trigger active" : "menu-trigger"}
          title="Song options"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          <MoreHorizontal size={18}/>
        </button>

        {open && (
          <div className="inline-menu">
            <button onClick={() => closeThen(() => onPlay(song))}><PlayCircle size={16}/> Play now</button>
            <button onClick={() => closeThen(() => onNext(song))}><SkipForward size={16}/> Play next</button>
            <button onClick={() => closeThen(() => onQueue(song))}><ListPlus size={16}/> Add to queue</button>
            <button onClick={() => closeThen(() => onFavorite(song))}><Heart size={16}/> Like / unlike</button>
            <button onClick={() => closeThen(() => onPlaylist(song))}><Library size={16}/> Add to playlist</button>
          </div>
        )}
      </div>
    </div>
  </div>;
}
function QueueRow({song, active, onPlay, onRemove}) {
  return <div className={`queue-row ${active ? "active" : ""}`}>
    <button className="queue-row-main" onClick={() => onPlay(song)}>
      <img src={song.thumbnail} alt=""/>
      <div><b>{song.title}</b><span>{song.channel}</span></div>
    </button>
    <button onClick={() => onRemove(song.id)}><Trash2 size={14}/></button>
  </div>;
}
function Empty({icon: Icon, text}) {
  return <div className="empty"><Icon size={24}/><span>{text}</span></div>;
}

createRoot(document.getElementById("root")).render(<App />);
