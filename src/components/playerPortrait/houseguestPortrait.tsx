import React from "react";
import { isSomeoneElseSelected, SelectedPlayerData, selectPlayer } from "./selectedPortrait";
import { Intruder, isNotWellDefined, Relationships, roundTwoDigits, SecretTwin } from "../../utils";
import { HouseguestPortraitController } from "./houseguestPortraitController";
import { PortraitDisplayMode } from "../../model/portraitDisplayMode";
import styled from "styled-components";
import { ColorTheme } from "../../theme/theme";
import { Tribe } from "../../model/tribe";
import { textColor } from "../../model/color";
import { cast$, getCast, getSelectedPlayer } from "../../subjects/subjects";
import { relationshipUpdate$ } from "../editRelationshipsScreen/editRelationshipScreen";
import { StatsMap } from "../../utils/statsMap";
import { Popularity } from "../../utils/popularity";
import { listFullName } from "../../utils/listStrings";

const Subtitle = styled.small`
    font-weight: 100;
    font-size: small;
`;

const MemoryWallPortrait = styled.div`
    margin: 5px;
    border: 3px solid ${({ theme }: { theme: ColorTheme }) => theme.portraitBorder};
    color: white;
    border-radius: 5px;
    text-align: center;
    font-weight: 600;
    width: 7rem;
    word-wrap: break-word;
    -webkit-transition-property: none;
    -moz-transition-property: none;
    -o-transition-property: none;
    transition-property: none;
`;

const Evicted = styled(MemoryWallPortrait)`
    font-weight: 100;
    color: grey;
    background-color: #111111;
`;

const Jury = styled(MemoryWallPortrait)`
    font-weight: 100;
    color: #c3ae88;
    background-color: #5d5340;
    filter: brightness(0.6);
`;

const Normal = styled.img`
    min-width: 100px;
    width: 100%;
    width: -moz-available;
    width: -webkit-fill-available;
    width: stretch;
    -webkit-transition-property: none;
    -moz-transition-property: none;
    -o-transition-property: none;
    transition-property: none;
`;

const Grayscale = styled(Normal)`
    filter: grayscale(100%);
`;

const Sepia = styled(Normal)`
    filter: sepia(100%);
`;

// this is a css moment !important;
const Editable = styled(MemoryWallPortrait)`
    :hover {
        color: orange;
        background-color: #fff6e1 !important;
    }
`;

export interface PortraitProps {
    imageURL: string;
    name: string[];
    alias: string;
    gender: string;
    age: number;
    hometown: string;
    occupation: string;
    personality: string;
    archetype: string;
    stats: StatsMap;
    traits: number[];
    popularity: Popularity;
    disableShowmances: boolean;
    attractedTo: string[];
    intruder: Intruder;
    secretTwin: SecretTwin;
    id?: number;
    relationships?: Record<number, Relationships>;
    isEvicted?: boolean;
    isJury?: boolean;
    housePopularity?: number;
    powerRanking?: number;
    deltaPopularity?: number;
    showInfo?: boolean;
    detailed?: boolean;
    superiors?: { [id: number]: number };
    friends?: number;
    enemies?: number;
    targetingMe?: number;
    targets?: number[];
    tribe?: Tribe;
    editable?: boolean;
    ignoreSelected?: boolean; // ie. is swap button active?
}

export interface PortraitState {
    housePopularity?: number;
    powerRanking?: number;
    displayMode: PortraitDisplayMode;
}

export class HouseguestPortrait extends React.Component<PortraitProps, PortraitState> {
    private controller: HouseguestPortraitController;

    public constructor(props: PortraitProps) {
        super(props);
        this.controller = new HouseguestPortraitController(this);
        this.state = this.controller.defaultState;
    }

    public componentDidMount() {
        if (isNotWellDefined(this.props.id)) {
            return;
        }
        this.controller.subscribe();
    }

    public componentWillUnmount() {
        this.controller.unsubscribe();
    }

    private changeRelationship(data: SelectedPlayerData): void {
        const heroName = listFullName(this.props.name);
        const villainName = listFullName(data?.name);
        const strength = this.props.relationships![data.id]?.strength ?? 0;
        const romance = this.props.relationships![data.id]?.romance ?? 0;

        let friendship = parseFloat(
            window.prompt(
                `Enter friendship value. ${heroName}'s current opinion towards ${villainName}:`,
                `${strength}`
            ) || ""
        );
        if (isNaN(friendship)) return;

        let romantic = parseFloat(
            window.prompt(
                `Enter romance value. ${heroName}'s current romantic feelings towards ${villainName}:`,
                `${romance}`
            ) || ""
        );
        if (isNaN(romantic)) return;

        let shouldLock = window.prompt(`Should these values stay the same throughout the game? (Y/N)`);

        relationshipUpdate$.next({
            hero: this.props.id!,
            villain: data.id!,
            strength: friendship,
            romance: romantic,
            locked: shouldLock === "Y" ? true : false
        });
    }

    private onClick(): void {
        const {
            editable,
            targets,
            id,
            relationships,
            ignoreSelected,
            isEvicted,
            housePopularity,
            superiors,
            name
        } = this.props;

        const hasZeroTargets = !editable && targets && targets[0] === 0 && targets[1] === 0;
        const isInvalidState = hasZeroTargets || isNotWellDefined(id) || !relationships;
        if (isInvalidState) return;

        const selectedPlayer = getSelectedPlayer() as SelectedPlayerData | null;
        const shouldChangeRelationship = editable && isSomeoneElseSelected(selectedPlayer, this.props) && !ignoreSelected;

        if (shouldChangeRelationship) {
            this.changeRelationship(selectedPlayer!);
            return;
        }

        selectPlayer({
            id,
            superiors,
            name,
            isEvicted: !!isEvicted,
            housePopularity: housePopularity || 0,
        });
    }

    public render() {
        const props = this.props;
        const Img = getImageClass(props);
        let subtitle: any[] = [];
        subtitle = this.state.displayMode.generateSubtitle(this.props, this.state, !!props.detailed);
        let tribeStyle: any = props.tribe
            ? { backgroundColor: props.tribe.color, color: textColor(props.tribe.color) }
            : {};
        let Portrait = MemoryWallPortrait;
        if (props.isJury && props.isEvicted) {
            Portrait = Jury;
            tribeStyle = {
                backgroundColor: "#5d5340",
                color: "#c3ae88",
                borderTop: "1px solid #5d5340",
                borderBottom: "1px solid #5d5340",
            };
        } else if (props.isEvicted) {
            Portrait = Evicted;
            tribeStyle = { backgroundColor: "#111111", color: "grey" };
        } else if (props.editable && isSomeoneElseSelected(getSelectedPlayer(), props)) {
            Portrait = Editable;
        }

        const firstName = props.name[0];
        const name = props.showInfo ? (props.alias || firstName) : "";
        const archetype = (
            <Subtitle>
                {props.personality} {props.archetype}
            </Subtitle>
        )
        const tribe = props.tribe ? (
            <TribeStyle style={tribeStyle}>
                <small>{props.tribe.name}</small>
            </TribeStyle>
        ) : undefined;
        
        const portraitInfo = props.showInfo ? (
            <>
                {tribe}
                {name}
                <br />
                {archetype}
                <Subtitle>{subtitle}</Subtitle>
            </>
        ) : undefined;
        const imageStyle: any = { height: 100, width: "-moz-available", objectFit: "cover", objectPosition: "top"};
        if (props.tribe || !props.showInfo) imageStyle["display"] = "block";
        return (
            <Portrait
                onClick={() => props.showInfo && this.onClick()}
                style={{
                    backgroundColor: this.controller.backgroundColor(props),
                }}
            >
                <Img src={props.imageURL} style={imageStyle} />
                {portraitInfo}
            </Portrait>
        );
    }
}

const TribeStyle = styled.div`
    overflow: hidden;
    white-space: nowrap;
    width: 100%;
    border-top: 1px solid black;
    border-bottom: 1px solid black;
    overflow: clip;
    display: block;
    min-height: 21px;
    font-weight: normal;
`;

function getImageClass(props: PortraitProps) {
    let imageClass = props.isEvicted ? Grayscale : Normal;
    imageClass = props.isJury && props.isEvicted ? Sepia : imageClass;
    return imageClass;
}
