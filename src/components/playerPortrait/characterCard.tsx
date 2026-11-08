import React, { useCallback } from "react";
import styled from "styled-components";
import { selectedColor } from "./houseguestPortraitController";
import { Intruder, SecretTwin, StatsMap } from "../../utils";
import { ARCHETYPES } from "./archetypes";
import { PERSONALITIES } from "./personalities";
import { CheckboxOptions } from "../castingScreen/castingScreen";
import { CCSectionRow } from "./utilities/sectionRow";
import { CCStatsSection } from "./utilities/statsSection";
import { CCIntruder } from "./utilities/intruder";
import { CCCardInfo } from "./utilities/cardInfo";
import { CCPortraitWrap } from "./utilities/portraitWrap";
import { CCSecretTwin } from "./utilities/secretTwin";
import { CCShowmance } from "./utilities/showmance";
import { CCPopularity } from "./utilities/popularity";
import { Popularity } from "../../utils/popularity";
import { PlayerProfile } from "../../model";
import { FormHandlers } from "./utilities/ccFormHandlers";
import { CCTraitsSection } from "./utilities/traitsSection";

export const unselectable = `   -webkit-touch-callout: none;
-webkit-user-select: none;
-khtml-user-select: none;
-moz-user-select: none;
-ms-user-select: none;
user-select: none;`;

export const Noselect = styled.div`
    ${unselectable}
`;

const XButton = styled(Noselect)`
    color: white;
    float: right;

    :active {
        color: #ff7133;
        background-color: #ffd8c7;
    }
    :hover {
        color: red;
        background-color: #ffe1ea;
    }
`;

const EMPTY_STYLE = {};

export interface CharacterCardProps {
    player: PlayerProfile;
    index: number;
    handlers: FormHandlers;
    twinOptions?: Array<{ id: number; name: string }>;
}

const handleStopPropagation = (e: React.MouseEvent) => e.stopPropagation();

export const CharacterCard = React.memo(function CharacterCard({
    player, // Read directly from the encapsulated player object prop
    index,
    selected,
    handlers,
    twinOptions,
}: { 
    player: PlayerProfile; 
    index: number; 
    selected: boolean; 
    handlers: FormHandlers;
    twinOptions: Array<{ id: number; name: string }>;
}) {    
    const style = selected ? { backgroundColor: selectedColor.toHex() } : EMPTY_STYLE;
    return (
        <div
            className="cc-card"
            onClick={handlers.onClick}
            data-id={player.castingScreenId}
            style={style}
        >
            <XButton
                data-index={index}
                onDoubleClick={handlers.onDelete}
                onClick={handleStopPropagation}
            >
                ✘
            </XButton>
            <div className="cc-card-top">
                <CCPortraitWrap
                    player={player}
                    index={index}
                    handlers={handlers}
                />
                <CCCardInfo
                    player={player}
                    index={index}
                    handlers={handlers}
                />
            </div>
            <CCSectionRow
                player={player}
                index={index}
                handlers={handlers}
            />
            <CCTraitsSection
                player={player}
                index={index}
                handlers={handlers}
            />
            <CCStatsSection
                player={player}
                index={index}
                handlers={handlers}
            />
            <CCIntruder
                player={player}
                index={index}
                handlers={handlers}
            />
            <CCSecretTwin
                player={player}
                index={index}
                handlers={handlers}
                twinOptions={twinOptions}
            />
            <CCPopularity
                player={player}
                index={index}
                handlers={handlers}
            />
            <CCShowmance
                player={player}
                index={index}
                handlers={handlers}
            />
        </div>
    );
});