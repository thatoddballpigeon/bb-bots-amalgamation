import "../../mainPage/bulma.scss";
import "../charCard.scss";
import React from "react";
import { CharacterCardProps } from "../characterCard";

const handleStopPropagation = (e: React.MouseEvent) => e.stopPropagation();

export const CCCardInfo = React.memo(function CCCardInfo({
    player,
    index,
    handlers
}: CharacterCardProps): JSX.Element {
    const { name, alias, gender, age, hometown, occupation } = player;
    const firstName = name[0] || "";
    const surname = name[1] || "";
    const lastName = name[2] || "";
    const id = index - 1;

    const { onRename, onStringChange, onNumberChange } = handlers;
    return (
        <div className="cc-card-info">
            <div className="cc-contestant-num">Contestant {index}</div>
            <div>
                <input
                    className="cc-name-input"
                    type="text"
                    data-id={id}
                    data-index="0"
                    placeholder="First name"
                    value={firstName}
                    onClick={handleStopPropagation}
                    onChange={onRename}
                />
                <input
                    className="cc-name-input"
                    type="text"
                    data-id={id}
                    data-index="1"
                    placeholder="Surname"
                    value={surname}
                    onClick={handleStopPropagation}
                    onChange={onRename}
                />
                <input className="cc-name-input"
                    type="text"
                    data-id={id}
                    data-index="2"
                    placeholder="Last name"
                    value={lastName}
                    onClick={handleStopPropagation}
                    onChange={onRename}
                />
            </div>
            <input
                className="cc-name-input cc-width"
                data-id={id}
                data-key="alias"
                type="text"
                placeholder="Alias"
                value={alias}
                onClick={handleStopPropagation}
                onChange={onStringChange}
            />
            <div className="cc-row cc-margin-top">
                <div className="cc-flex-1">
                    <div className="cc-field-label">Gender</div>
                    <select
                        className="cc-select"
                        data-id={id}
                        data-key="gender"
                        value={gender}
                        onClick={handleStopPropagation}
                        onChange={onStringChange}
                    >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Non-binary">Non-binary</option>
                    </select>
                </div>
                <div className="cc-flex-0">
                    <div className="cc-field-label">Age</div>
                    <input
                        className="bb-input"
                        type="number"
                        data-id={id}
                        data-key="age"
                        placeholder="Age"
                        style={{padding: "5px 8px", fontSize: "0.78rem", width: "100%"}}
                        value={age}
                        onClick={handleStopPropagation}
                        onChange={onNumberChange}
                    />
                </div>
            </div>
            <div className="cc-row cc-margin-top">
                <div className="cc-flex-1">
                    <input
                        className="cc-name-input cc-width"
                        data-id={id}
                        data-key="hometown"
                        type="text"
                        placeholder="Hometown"
                        value={hometown}
                        onClick={handleStopPropagation}
                        onChange={onStringChange}
                    />
                </div>
            </div>
            <div className="cc-row cc-margin-top">
                <div className="cc-flex-1">
                    <input
                        className="cc-name-input cc-width"
                        data-id={id}
                        data-key="occupation"
                        type="text"
                        placeholder="Occupation"
                        value={occupation}
                        onClick={handleStopPropagation}
                        onChange={onStringChange}
                    />
                </div>
            </div>
        </div>
    );
});