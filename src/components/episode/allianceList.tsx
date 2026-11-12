import React from "react";
import styled from "styled-components";
import { GameState, getHouseguestById, Houseguest } from "../../model";
import { ColorTheme } from "../../theme/theme";
import { isNotNull, isNotWellDefined } from "../../utils";
import { Centered, CenteredBold } from "../layout/centered";
import { HasText } from "../layout/text";
import { Portraits } from "../playerPortrait/portraits";
import { OverlayBox } from "../layout/box";

export const HelpLink = styled.a`
    color: ${({ theme }: { theme: ColorTheme }) => theme.link};
    cursor: pointer;
    font-weight: bold;
    margin-top: 10px;
    margin-bottom: 10px;
`;

interface AllianceListProps {
    gameState: GameState;
}

export function AllianceList(props: AllianceListProps) {
    const alliances = props.gameState.alliances;
    const elements: JSX.Element[] = [];
    if (alliances.length === 0) {
        elements.push(
            <HasText>
                <Centered>
                    No alliances as of now.
                </Centered>
            </HasText>
        );
    }
    alliances.forEach((alliance, i) => {
        elements.push(<hr key={`hr-${i}`} />);
        props.gameState.split[i] &&
            elements.push(<CenteredBold key={`title-${i}`}>{props.gameState.split[i].name}</CenteredBold>);
        elements.push(
            <OverlayBox>
                <Centered>{alliance.name} {alliance.episodeDissolved ? `(Dissolved in episode ${alliance.episodeDissolved})` : ""}</Centered>
                <Portraits
                    centered={true}
                    detailed={false}
                    showInfo={false}
                    key={`alliance-${i}-${props.gameState.episode}`}
                    houseguests={alliance.members.map(id => getHouseguestById(props.gameState, id))}
                />
                <Centered>Loyalty: {alliance.strength} / 10</Centered>
                <Centered>Episode formed: {alliance.episodeFormed}</Centered>
            </OverlayBox>
        );
    });
    return (
        <div>
            {elements}
        </div>
    );
}
