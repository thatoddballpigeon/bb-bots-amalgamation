import "../charCard.scss";
import React, { useMemo } from "react";
import { CharacterCardProps } from "../characterCard";

const TRAIT_META = [
    {
        key: 0,
        label: 'Warmth',
        desc: 'Low = cold. High = warm.'
    },
    {
        key: 1,
        label: 'Loyalty',
        desc: 'Low = opportunistic. High = loyal.'
    },
    {
        key: 2,
        label: 'Authenticity',
        desc: 'Low = superficial. High = genuine/principled.'
    },
    {
        key: 3,
        label: 'Cooperation',
        desc: 'Low = individualistic. High = team player.'
    },
    {
        key: 4,
        label: 'Composure',
        desc: 'Low = volatile. High = calm.'
    },
    {
        key: 5,
        label: 'Ego',
        desc: 'Low = humble. High = narcissistic.'
    },
    {
        key: 6,
        label: 'Trust',
        desc: 'Low = suspicious. High = open/trusting.'
    },
    {
        key: 7,
        label: 'Intensity',
        desc: 'Low = low-key. High = dramatic.'
    },
];

interface CCTraitRowProps {
    index: number;
    traitMeta: typeof TRAIT_META[number];
    traitValue: number;
    onStatChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onStopPropagation: (e: React.MouseEvent) => void;
}

const handleStopPropagation = (e: React.MouseEvent) => e.stopPropagation();

export const CCTraitsSection = React.memo(function CCTraitsSection({
    player,
    index,
    handlers,
}: CharacterCardProps): JSX.Element {
    const id = index - 1;
    const traits = player.traits;

    const { onStatChange } = handlers;
    return (
        <div className="cc-traits-section">
            <div className="cc-stat-div">
                <div className="cc-field-label">Traits</div>
            </div>
            {TRAIT_META.map(s => {
                const value = (Math.round(traits[s.key] * 50) + 50);
                return (
                    <CCTraitRow
                        key={`cc-trait-${s.key}`}
                        index={id}
                        traitMeta={s}
                        traitValue={value}
                        onStatChange={onStatChange}
                        onStopPropagation={handleStopPropagation}
                    />
                );
            })}
        </div>
    );
},
    (prevProps, nextProps) => {
        if (prevProps.index !== nextProps.index) return false;
  
        const prevTraits = prevProps.player.traits;
        const nextTraits = nextProps.player.traits;
        
        return TRAIT_META.every(s => prevTraits[s.key] === nextTraits[s.key]);
    }
);

const CCTraitRow = React.memo(function CCTraitRow({ 
    index,
    traitMeta, 
    traitValue,
    onStatChange, 
    onStopPropagation 
}: CCTraitRowProps) {
    return (
        <div className="cc-trait-row">
            <div className="cc-field-label" title={traitMeta.desc}>
                {traitMeta.label}
            </div>
            <input
                type="range"
                className="cc-trait-slider"
                value={traitValue}
                min="0"
                max="100"
                onClick={onStopPropagation}
                onChange={onStatChange}
                data-id="traits"
                data-index={index}
                data-key={traitMeta.key}
            />
            <span className="cc-trait-value">{traitValue}%</span>
        </div>
    );
});