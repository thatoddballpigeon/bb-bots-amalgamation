import { CharacterCardProps } from "../characterCard";
import "../charCard.scss";
import React, { useMemo } from "react";

const handleStopPropagation = (e: React.MouseEvent) => e.stopPropagation();

const GENDERS = ["Male", "Female", "Non-binary"] as const;

const GenderCheckbox = React.memo(function GenderCheckbox({
    gender,
    isChecked,
    id,
    onChange
}: {
    gender: string;
    isChecked: boolean;
    id: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <label
            className="cc-gender-checkbox-label"
            onClick={handleStopPropagation}
        >
            <input
                className="cc-gender-checkbox-input"
                type="checkbox"
                data-id={id}
                data-key="attractedTo"
                data-gender={gender}
                checked={isChecked}
                onChange={onChange}
            />
            <span className="cc-gender-checkbox-text">
                {gender}
            </span>
        </label>
    );
});

export const CCShowmance = React.memo(function CCShowmance({
    player,
    index,
    handlers,
}: CharacterCardProps): JSX.Element {
    const id = index - 1;
    const { onCheckboxToggle } = handlers;

    const disableShowmances = player.disableShowmances ?? false;
    const attractionList = player.attractedTo ?? [];

    return (
        <div className="cc-showmance-container">
            <label
                className="cc-showmance-main-label"
                onClick={handleStopPropagation}
            >
                <input 
                    className="cc-showmance-main-input"
                    type="checkbox"
                    data-id={id}
                    data-key="disableShowmances"
                    checked={disableShowmances}
                    onChange={onCheckboxToggle}
                />
                <span className="cc-showmance-main-text">Block Showmances</span>
            </label>
            {!disableShowmances && (
                <div className="cc-showmance-options">
                    <span className="cc-showmance-title">Attracted to:</span>
                    {GENDERS.map(g => {
                        const isChecked = attractionList.includes(g);
                        return (
                            <GenderCheckbox 
                                key={g}
                                gender={g}
                                id={id}
                                isChecked={isChecked}
                                onChange={onCheckboxToggle}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
});