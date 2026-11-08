import "../charCard.scss";
import React, { useMemo } from "react";
import { StatsMap } from "../../../utils";
import { CharacterCardProps } from "../characterCard";

const STAT_META = [
    {
        key: 'physical',
        label: 'Physical',
        color: '#f87171',
        desc: 'Physical challenges and athletic tasks.'
    },
    {
        key: 'mental',
        label: 'Mental',
        color: '#60a5fa',
        desc: 'Strategy, puzzles, and mental endurance.'
    },
    {
        key: 'endurance',
        label: 'Endurance',
        color: '#4ade80',
        desc: 'Endurance under pressure over time.'
    },
    {
        key: 'charisma',
        label: 'Charisma',
        color: '#f472b6',
        desc: 'Social game and public popularity.'
    },
    {
        key: 'temper',
        label: 'Temper',
        color: '#fb923c',
        desc: 'Composure and social volatility under pressure.'
    },
    {
        key: 'luck',
        label: 'Luck',
        color: '#f1d014',
        desc: 'How "lucky" one will be during minigames.'
    }
];

interface CCStatRowProps {
    index: number;
    statMeta: typeof STAT_META[number];
    statValue: number;
    totalStats: number;
    onStatChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onStopPropagation: (e: React.MouseEvent) => void;
}

const handleStopPropagation = (e: React.MouseEvent) => e.stopPropagation();

export const CCStatsSection = React.memo(function CCStatsSection({
    player,
    index,
    handlers,
}: CharacterCardProps): JSX.Element {
    const id = index - 1;
    const stats = player.stats;

    const totalStats = Object.values(stats).reduce((sum: number, val: number) => sum + val, 0);

    const { onStatChange } = handlers;
    return (
        <div className="cc-stats-section">
            <div className="cc-stat-div">
                <div className="cc-field-label">Stats</div>
                <div className="cc-stat-text-size">Recommended: {totalStats} / 30</div>
            </div>
            {STAT_META.map(s => {
                const value = stats[s.key as keyof StatsMap] ?? 1;
                return (
                    <CCStatRow
                        key={`cc-stat-${s.key}`}
                        index={id}
                        statMeta={s}
                        statValue={value}
                        totalStats={totalStats}
                        onStatChange={onStatChange}
                        onStopPropagation={handleStopPropagation}
                    />
                );
            })}
        </div>
    );
});

const CCStatRow = React.memo(function CCStatRow({
    index,
    statMeta, 
    statValue,
    totalStats,
    onStatChange, 
    onStopPropagation 
}: CCStatRowProps) {
    return (
        <div className="cc-stat-row">
            <div className="cc-field-label" style={{color: statMeta.color}} title={statMeta.desc}>
                {statMeta.label}
            </div>
            <input
                type="range"
                className="cc-stat-slider"
                value={statValue}
                min="1"
                max="10"
                style={{'--stat-color': statMeta.color} as React.CSSProperties}
                onClick={onStopPropagation}
                onChange={onStatChange}
                data-id="stats"
                data-index={index}
                data-key={statMeta.key}
                data-total={totalStats}
                data-current-value={statValue}
            />
            <span className="cc-stat-value">{statValue}</span>
        </div>
    );
});