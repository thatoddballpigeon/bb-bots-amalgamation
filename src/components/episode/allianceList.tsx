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
    alliances.forEach((alliance, i) => {
        elements.push(<hr key={`hr-${i}`} />);
        props.gameState.split[i] &&
            elements.push(<CenteredBold key={`title-${i}`}>{props.gameState.split[i].name}</CenteredBold>);
        if (alliances.length === 0) {
            elements.push(
                <HasText>
                    <Centered>
                        No alliances as of now.
                    </Centered>
                </HasText>
            );
        }
        elements.push(
            <OverlayBox>
                <Centered>{alliance.name}</Centered>
                <Portraits
                    centered={true}
                    detailed={false}
                    showInfo={false}
                    key={`alliance-${i}-${props.gameState.episode}`}
                    houseguests={alliance.members.map(id => getHouseguestById(props.gameState, id))}
                />
                <Centered>{alliance.strength} / 10</Centered>
                <Centered>Episode formed: {alliance.episodeFormed}</Centered>
            </OverlayBox>
        );
    });
    elements.shift(); // removes the leading hr
    return (
        <div>
            {elements}
            {props.gameState.episode < 3 && (
                <HelpLink
                    href="https://github.com/spaulmark/bb-bots/blob/master/README.md#understanding-alliances-or-what-do-the-arrows-mean"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    What do the arrows mean?
                </HelpLink>
            )}
        </div>
    );
}
