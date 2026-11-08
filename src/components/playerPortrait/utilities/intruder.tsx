import { CharacterCardProps } from "../characterCard";
import "../charCard.scss";
import React, { useCallback } from "react";

const handleStopPropagation = (e: React.MouseEvent) => e.stopPropagation();

export const CCIntruder = React.memo(function CCIntruder({
    player,
    index,
    handlers
}: CharacterCardProps): JSX.Element {
    const { isIntruder, introWeek } = player.intruder;
    const id = index - 1;

    const { onCheckboxToggle, onNumberChange } = handlers;
    return (
        <div className="cc-intruder-container">
            <label className="cc-label" onClick={handleStopPropagation}>
                <input
                    className="cc-intruder-checkbox"
                    type="checkbox"
                    data-id={id}
                    data-key="intruder"
                    checked={isIntruder}
                    onChange={onCheckboxToggle}
                />
                <span className={`cc-label-text ${isIntruder ? 'cc-intruder-active' : 'cc-text-inactive'}`}>
                    Intruder
                </span>
            </label>
                {isIntruder && (
                    <div className="cc-label-top cc-flex-panel">
                    <span className="cc-panel-span">Enters during week:</span>
                    <input
                        type="number"
                        className="cc-intruder-entry-input"
                        data-id={id}
                        data-key="intruderEntry"
                        min="1"
                        value={introWeek}
                        onClick={handleStopPropagation}
                        onChange={onNumberChange}
                    />
                </div>
                )}
        </div>
    );
});