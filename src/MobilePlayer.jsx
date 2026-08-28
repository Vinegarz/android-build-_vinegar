import React, { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  Heart,
  ListMusic,
  Volume2,
  VolumeX,
  GripHorizontal
} from "lucide-react";

export default function MobilePlayer({
  isMobile,
  song,
  playing,
  playerReady,
  progress,
  duration,
  muted,
  isFavorite,
  onTogglePlay,
  onPrevious,
  onNext,
  onSeek,
  onToggleMute,
  onToggleFavorite,
  onOpenQueue,
  formatTime
}) {
  const [open, setOpen] = useState(false);

  if (!isMobile || !song) return null;

  const percent = Math.max(
    0,
    Math.min(100, duration > 0 ? (progress / duration) * 100 : 0)
  );

  const openQueue = () => {
    setOpen(false);
    window.setTimeout(() => onOpenQueue(), 0);
  };

  return (
    <>
      <div className="mobile-mini-player" role="button" tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-label="Open now playing"
      >
        <img src={song.thumbnail} alt="" />
        <div className="mobile-mini-copy">
          <b>{song.title}</b>
          <span>{song.channel}</span>
        </div>
        <div className="mobile-mini-progress" aria-hidden="true">
          <i style={{ width: `${percent}%` }} />
        </div>
        <button
          type="button"
          className="mobile-mini-play"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          disabled={!playerReady}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
        </button>
      </div>

      {open && (
        <div className="mobile-player-sheet" role="dialog" aria-modal="true" aria-label="Now playing">
          <button
            type="button"
            className="mobile-player-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Close player"
          />

          <section className="mobile-player-card">
            <button
              type="button"
              className="mobile-sheet-handle"
              onClick={() => setOpen(false)}
              aria-label="Close now playing"
            >
              <GripHorizontal size={28} />
            </button>

            <header className="mobile-player-header">
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <ChevronDown size={24} />
              </button>
              <span>NOW PLAYING</span>
              <button type="button" onClick={openQueue} aria-label="Open queue">
                <ListMusic size={21} />
              </button>
            </header>

            <div className="mobile-album-wrap">
              <img className="mobile-album-art" src={song.thumbnail} alt="" />
            </div>

            <div className="mobile-song-meta">
              <div>
                <h2 title={song.title}>{song.title}</h2>
                <p title={song.channel}>{song.channel}</p>
              </div>
              <button
                type="button"
                className={isFavorite ? "mobile-liked" : ""}
                onClick={onToggleFavorite}
                aria-label={isFavorite ? "Remove from liked songs" : "Add to liked songs"}
              >
                <Heart size={23} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="mobile-timeline">
              <input
                type="range"
                min="0"
                max={Math.max(duration, 1)}
                value={Math.min(progress, Math.max(duration, 1))}
                onChange={(e) => onSeek(Number(e.target.value))}
                aria-label="Song progress"
              />
              <div>
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="mobile-main-controls">
              <button type="button" onClick={onPrevious} aria-label="Previous">
                <SkipBack size={26} fill="currentColor" />
              </button>
              <button
                type="button"
                className="mobile-main-play"
                onClick={onTogglePlay}
                disabled={!playerReady}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
              </button>
              <button type="button" onClick={onNext} aria-label="Next">
                <SkipForward size={26} fill="currentColor" />
              </button>
            </div>

            <div className="mobile-secondary-controls">
              <button type="button" onClick={onToggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <button type="button" onClick={openQueue} aria-label="Open queue">
                <ListMusic size={20} />
                <span>Queue</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
