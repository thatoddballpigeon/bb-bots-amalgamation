import React from "react";
import { PortraitDisplayMode, powerMode } from "../../model/portraitDisplayMode";
import { displayMode$, getSelectedPlayer, selectedPlayer$ } from "../../subjects/subjects";
import { Subscription } from "rxjs";
import { GameState } from "../../model";
import { EpisodeLog } from "../../model/logging/episodeLog";

interface RatingsWidgetProps {
    log: EpisodeLog[][];
    ratingColor: (rating: number) => string;
    ratingTier: (rating: number) => string;
}

interface BottomBarTagProps {
    gameState?: GameState;
    text: string;
    disabled?: boolean;
}

export class BottomBarTag extends React.Component<BottomBarTagProps, { selected: boolean }> {
    private sub: Subscription | null = null;
    
    public constructor(props: BottomBarTagProps) {
        super(props);
        this.state = { selected: false };
    }

    public componentWillUnmount() {
        if (this.sub) this.sub.unsubscribe();
    }

    private onClick = () => {
        !this.props.disabled && this.setState({ selected: !this.state.selected });
    }

    public render() {
        const style = getStyle(this.props);
        return (
            <>
                <span
                    className="level is-mobile level-item tag is-medium is-light"
                    style={style}
                    onClick={this.onClick}
                >
                    {styleText(this.props.text, this.state.selected)}
                </span>
                {(this.props.text === "TV Ratings" && this.state.selected) && (
                    <RatingsWidget 
                        log={this.props.gameState?.log || []} 
                        ratingColor={ratingColor} 
                        ratingTier={ratingTier} 
                    />
                )}
            </>
        );
    }
}

function styleText(text: string, selected: boolean): JSX.Element {
    return selected ? <b>{text}</b> : <i>{text}</i>;
}

function getStyle(props: BottomBarTagProps) {
    return props.disabled
        ? {}
        : {
              cursor: "pointer",
          };
}

function ratingColor(rating: number) {
    rating = Math.round(rating * 10) / 10;
    if (rating < 2)   return '#991b1b'; // Dogwater
    if (rating < 4)   return '#f87171'; // Bad
    if (rating < 5)   return '#fb923c'; // Okay
    if (rating < 6)   return '#9ca3af'; // Average
    if (rating < 7.5) return '#86efac'; // Good
    if (rating < 9)   return '#22c55e'; // Great
    return '#fcd34d';                   // Iconic
}

function ratingTier(rating: number) {
    rating = Math.round(rating * 10) / 10;
    if (rating < 2)   return 'Dogwater';
    if (rating < 4)   return 'Bad';
    if (rating < 5)   return 'Okay';
    if (rating < 6)   return 'Average';
    if (rating < 7.5) return 'Good';
    if (rating < 9)   return 'Great';
    return 'Iconic';
}

export const RatingsWidget: React.FC<RatingsWidgetProps> = ({ 
  log = [], 
  ratingColor, 
  ratingTier 
}) => {
    const eps = log.flat().filter(e => e?.tvRatings !== null && e?.tvRatings !== undefined);
    if (eps.length === 0) return (
      <div style={{
          padding: "24px",
          textAlign: "center",
          fontSize: "0.82rem",
          color: "#4b5563",
          fontFamily: "'Inter',sans-serif;"
      }}>
          No rated episodes yet.
      </div>
    );

    const overall = eps.reduce((sum, log) => sum + (log.tvRatings?.cycleRating ?? 0), 0) / eps.length;
    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'rgba(255, 61, 107, 0.06)',
            borderBottom: '1px solid rgba(255, 61, 107, 0.15)'
        }}>
        <div style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(255, 61, 107, 0.7)'
        }}>
        Season Average
        </div>
        <div style={{
            fontSize: '1rem',
            fontWeight: 800,
            color: ratingColor(overall),
            fontVariantNumeric: 'tabular-nums'
        }}>
        {overall.toFixed(1)}
        </div>
        </div>

        {eps.map((ep, i) => {
        const r = ep.tvRatings?.cycleRating ?? 0;

        const col = ratingColor(r);

        return (
            <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '7px 14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
            }}>
            <div style={{
            width: '52px',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: '#9ca3af',
            fontFamily: "'Inter', sans-serif",
            flexShrink: 0
            }}>
            Episode {i + 1}
            </div>

            <div style={{
            flex: 1,
            height: '6px',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '3px',
            overflow: 'hidden'
            }}>
            <div style={{
            width: `${Math.max(2, r * 10)}%`,
            height: '100%',
            background: col
            }} />
            </div>

            <div style={{
            width: '76px',
            textAlign: 'right',
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            color: col,
            fontFamily: "'Inter', sans-serif",
            flexShrink: 0
            }}>
            {ratingTier(r)}
            </div>

            <div style={{
            width: '34px',
            textAlign: 'right',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: col,
            fontFamily: "'Inter', sans-serif",
            fontVariantNumeric: 'tabular-nums'
            }}>
            {r.toFixed(1)}
            </div>
            </div>
            );
            })}
        </div>
    );
};