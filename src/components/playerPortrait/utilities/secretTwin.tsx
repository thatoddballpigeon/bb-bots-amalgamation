import { usePlayers } from "../../castingScreen/castingScreen";
import "../charCard.scss";
import React from "react";
import { CharacterCardProps } from "../characterCard";

const handleStopPropagation = (e: React.MouseEvent) => e.stopPropagation();

export const CCSecretTwin = React.memo(
    function CCSecretTwin({
        player,
        index,
        handlers,
        twinOptions
    }: CharacterCardProps): JSX.Element {
        const { isTwin, isPrimaryTwin, twinPartner, twinEntryEpisode: twinEntryWeek } = player.secretTwin;
        const id = index - 1;
        const csId = player.castingScreenId ?? -1;

        const twins = twinOptions ?? [];

        const { onCheckboxToggle, onNumberChange } = handlers;
        return (
            <>
                <label className="cc-label-top">
                    <input
                        type="checkbox"
                        className="cc-twin-checkbox"
                        data-id={id}
                        data-key="secretTwin"
                        checked={isTwin}
                        onClick={handleStopPropagation}
                        onChange={onCheckboxToggle}
                    />
                    <span className={`cc-label-text ${isTwin ? 'cc-twin-active' : 'cc-text-inactive'}`}>
                        Secret Twin
                    </span>
                </label>
                {isTwin && (
                <div key={`cc-twin-panel-${csId}`} className="cc-twin-panel">
                    <div className="cc-twin-panel-wrap">
                        <span className="cc-panel-span">Twin partner:</span>
                        <select
                            key={`cc-twin-partner-${csId}`}
                            className="cc-twin-partner"
                            data-id={id}
                            data-key="twinPartner"
                            value={twinPartner ?? -1}
                            onClick={handleStopPropagation}
                            onChange={onNumberChange}
                        >
                            <option value="-1">Surprise (random)</option>
                            {twins.map(p => {
                                if (p.id === csId) return null;
                                return <option key={p.id} value={p.id}>{p.name}</option>;
                            })}
                        </select>
                    </div>
                    <div key={`cc-twin-week-wrap-${csId}`} className="cc-twin-week-wrap">
                        <span className="cc-panel-span">Enters if primary survives to week:</span>
                        <input
                            key={`cc-twin-ep-${csId}`}
                            type="number"
                            className="cc-twin-entry"
                            data-id={id}
                            data-key="twinEntryWeek"
                            min="1"
                            onClick={handleStopPropagation}
                            onChange={onNumberChange}
                            value={twinEntryWeek || 1}
                        />
                    </div>
                </div>
                )}
            </>
        );
    }
);