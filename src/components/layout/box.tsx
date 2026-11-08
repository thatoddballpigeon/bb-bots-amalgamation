import React from "react";
import styled from "styled-components";
import { ColorTheme } from "../../theme/theme";
import { Portraits } from "../playerPortrait/portraits";
import { Centered, CenteredBold } from "./centered";
import { STAT_UI } from "../episode/utilities/competitions";

interface StatCompetitionProps {
    border: string;
    bg: string;
}

const BoxBodyArea = styled.div`
    margin-left: 3px;
    margin-right: 3px;
    margin-bottom: 3px;
    border-style: solid;
    border-width: 2px;
    border-radius: 6px;
    background: ${({ theme }: { theme: ColorTheme }) => theme.bodyArea};
    border-color: ${({ theme }: { theme: ColorTheme }) => theme.bodyAreaBorder};
`;

const BoxOverlay = styled.div`
    box-shadow: ${({ theme }: { theme: ColorTheme }) =>
        theme.name === "light" ? "0 2px 3px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1)" : ""};
    margin-left: 3px;
    margin-right: 3px;
    margin-bottom: 3px;
    border-style: solid;
    border-width: 2px;
    border-radius: 6px;
    background: ${({ theme }: { theme: ColorTheme }) => theme.overlay};
    border-color: ${({ theme }: { theme: ColorTheme }) => theme.overlayBorder};
`;

const ImageBackground = styled.div`
    background-image: ${({ theme, imageURL }: { theme: ColorTheme, imageURL: string }) =>
        `radial-gradient(ellipse, transparent 15%, ${theme.overlay} 90%), url(${imageURL})`};
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center;
`;

// box with background
const BoxHouseEvent = styled.div`
    margin-bottom: 24px;
    text-align: center;
    padding: 20px 20px 18px;
    background-image: ${({ theme, imageURL }: { theme: ColorTheme, imageURL: string }) =>
        `radial-gradient(ellipse, transparent 15%, ${theme.overlay} 90%), url(${imageURL})`};
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center;
    border-radius: 10px;
    border: ${({ theme }: { theme: ColorTheme }) => 
        `2px solid ${theme.overlayBorder}`};
    position: relative;
`;
const BoxEventTop = styled.div`
    position: absolute;
    top: 12px;
    left: 14px;
    right: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    justify-content: space-between;
`;
const BoxEventBottom = styled(BoxEventTop)`
    top: calc(100% - 32px);
`;

const EventLabel = styled.span`
    font-size: 0.8rem;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 2px 6px;
    font-family: "Proxima Nova Extrabold", sans-serif;
`;

const RecordLabel = styled(EventLabel)`
    background: #a40101;
    letter-spacing: 0.08em;
    border-radius: 5px;
    border: 2px solid #f01212;
    margin-left: auto;
`;

const EventText = styled.p`
    color: white;
    font-size: 0.93rem;
    max-width: 640px;
    margin: 0 auto;
    line-height: 1.65;
    font-family: "Proxima Nova Extrabold", sans-serif;
`;

// competitions
const BoxCompetition = styled.div`
    background: ${({ theme }: { theme: ColorTheme }) => theme.overlay};
    border: ${({ theme }: { theme: ColorTheme }) => 
        `2px solid ${theme.overlayBorder}`};
    border-radius: 10px;
    padding: 22px 24px;
    margin-bottom: 28px;
    text-align: center;
`;
const StatCompetition = styled.div<StatCompetitionProps>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: ${({ bg }) => bg};
    border: ${({ border }) => 
        `2px solid ${border}`};
    border-radius: 4px;
    margin-bottom: 14px;
`;
const StatBackground = styled.div`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ color }: { color: string }) => color};
    flex-shrink: 0;
`;
const StatText = styled.span`
    font-size: 0.68rem;
    font-weight: 800;
    color: ${({ color }: { color: string }) => color};
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-family: "Proxima Nova Extrabold", sans-serif;
`;

export function BodyAreaBox(props: any): JSX.Element {
    return (
        <BoxBodyArea style={props.style} className={`box ${props.className || ""}`}>
            {props.children}
        </BoxBodyArea>
    );
}

export function OverlayBox(props: any): JSX.Element {
    return (
        <BoxOverlay style={props.style} className={props.className || ""}>
            {props.children}
        </BoxOverlay>
    );
}

export function BackgroundImage(props: any): JSX.Element {
    return (
        <ImageBackground imageURL={props.imageURL} style={props.style}>
            {props.children}
        </ImageBackground>
    );
};

export function HouseEventBox(props: any): JSX.Element {
    return (
        <>
            <BoxHouseEvent imageURL={props.imageURL}>
                <BoxEventTop>
                    {props.category ? <EventLabel>{props.category}</EventLabel> : ""}
                    <RecordLabel>● REC</RecordLabel>
                </BoxEventTop>
                <Portraits showInfo={false} centered={true} detailed={false} houseguests={props.houseguests} />
                {props.text ? <EventText>{props.text}</EventText> : ""}
                <BoxEventBottom>
                    {props.location ? <EventLabel>{props.location}</EventLabel> : ""}
                </BoxEventBottom>
            </BoxHouseEvent>
        </>
    );
}

export function CompetitionBox(props: any): JSX.Element {
    const stat = props.stat as keyof typeof STAT_UI;
    return (
        <>
            <BoxCompetition>
                <CenteredBold>{props.title}</CenteredBold>
                <StatCompetition bg={STAT_UI[stat].bg} border={STAT_UI[stat].border}>
                    <StatBackground color={STAT_UI[stat].color} />
                    <StatText color={STAT_UI[stat].color}>{props.stat}</StatText>
                </StatCompetition>
                <Centered>{props.text}</Centered>
            </BoxCompetition>
        </>
    );
}

/*
divider = shadow/overlay
box = styled/bodyarea
*/
