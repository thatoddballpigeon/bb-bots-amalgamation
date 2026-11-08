import "../charCard.scss";
import React from "react";
import { applyStartingPopularity, FAME } from "../../../utils/popularity";
import { usePlayers } from "../../castingScreen/castingScreen";
import { CharacterCardProps } from "../characterCard";

const handleStopPropagation = (e: React.MouseEvent) => e.stopPropagation();

export const CCPopularity = React.memo(function CCPopularity({
    player,
    index,
    handlers
}: CharacterCardProps): JSX.Element {
    const { players } = usePlayers();
    const { fame, startPopularity } = player.popularity;
    const id = index - 1;

    const { onCheckboxToggle, onNumberChange, onStringChange } = handlers;

    const defaultPopularity = players[id] ? applyStartingPopularity(players[id]) : 0;
    const isCustomPopActive = typeof startPopularity === 'number';

    return (
        <div className="cc-popularity">
            <label
                key={`cc-fame-label-${id}`} 
                className="cc-label"
                onClick={handleStopPropagation}
            >
                <input
                    type="checkbox"
                    className="cc-fame-checkbox"
                    data-id={id}
                    data-key="fame"
                    checked={!!fame}
                    onClick={handleStopPropagation}
                    onChange={onCheckboxToggle}
                />
                <span className={`cc-label-text ${!!fame ? 'cc-fame-active' : 'cc-text-inactive'}`}>
                    Famous
                </span>
            </label>
            {!!fame && (
                <div className="cc-popularity-panel cc-flex-panel" onClick={handleStopPropagation}>
                    <select
                        className="cc-select cc-flex-1"
                        data-id={id}
                        data-key="fame"
                        value={typeof fame === 'string' ? fame : ""}
                        onChange={onStringChange}
                    >
                        <option value="" disabled>Select tier...</option>
                        {Object.entries(FAME).map(([k, f]) => (
                            <option key={k} value={k}>{f.label}</option>
                        ))}
                    </select>
                </div>
            )}
            <label key={`cc-pop-label-${id}`} className="cc-label-top" onClick={handleStopPropagation}>
                <input
                    type="checkbox"
                    data-id={id}
                    data-key="popularity"
                    className="cc-pop-checkbox"
                    checked={typeof startPopularity==='number'}
                    onChange={onCheckboxToggle}
                />
                <span className={`cc-label-text ${isCustomPopActive ? 'cc-pop-active' : 'cc-text-inactive'}`}>
                    Custom Starting Popularity
                </span>
            </label>
            {isCustomPopActive && (
                <div className="cc-popularity-panel cc-flex-panel" onClick={handleStopPropagation}>
                    <input
                        type="range"
                        className="cc-pop-slider"
                        data-id={id}
                        data-key="customPopularity"
                        min="0"
                        max="100"
                        value={startPopularity ?? defaultPopularity}
                        onChange={onNumberChange}
                    />
                    <span className="cc-pop-value">
                        {startPopularity ?? defaultPopularity}
                    </span>
                </div>
            )}
        </div>
    );
});