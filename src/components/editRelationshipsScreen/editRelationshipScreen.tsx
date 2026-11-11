import React from "react";
import { GameState, PlayerProfile } from "../../model";
import { MemoryWall } from "../memoryWall";
import { HasText } from "../layout/text";
import { CenteredBold } from "../layout/centered";
import { Tribe } from "../../model/tribe";
import { classifyRelationship, RelationshipType } from "../../utils/ai/classifyRelationship";
import {
    getCast,
    newEpisode,
    overwriteCast,
    pushToMainContentStream,
    selectedPlayer$,
} from "../../subjects/subjects";
import { PregameScreen } from "../pregameScreen/pregameScreen";
import { Screens } from "../topbar/topBar";
import { PregameEpisode } from "../episode/pregameEpisode";
import { selectPlayer } from "../playerPortrait/selectedPortrait";
import { getLastHoHPlaysVeto, getLastJurySize, getLastFinalistSize } from "../seasonEditor/seasonEditorPage";
import { Subject, Subscription } from "rxjs";
import { firstImpressionsMap, isWellDefined, Relationships } from "../../utils";
import { shuffle } from "lodash";
import { textColor } from "../../model/color";
import { listFullName } from "../../utils/listStrings";

interface RelationshipScreenProps {
    profiles: PlayerProfile[];
    initialTribes?: Tribe[];
    currentTribes?: { [id: number]: Tribe };
    relationships?: Record<number, Record<number, Relationships>>; // hero -> villain -> relationship
}

interface RelationshipScreenState {
    cast: PlayerProfile[];
    relationships: Record<number, Record<number, Relationships>>; // hero -> villain -> relationship
    currentTribes: { [id: number]: Tribe };
    selectedPlayer: number | undefined;
    swapButtonActive: boolean;
}

// subject for updating relationships
export const relationshipUpdate$ = new Subject<{ hero: number; villain: number; strength: number; romance: number, locked: boolean }>();

export class EditRelationshipsScreen extends React.Component<
    RelationshipScreenProps,
    RelationshipScreenState
> {
    private subs: Subscription[] = [];
    public constructor(props: RelationshipScreenProps) {
        super(props);
        const currentTribes =
            props.currentTribes ||
            (props.initialTribes ? this.initalizeTribes(props.profiles, props.initialTribes) : {});
        this.state = {
            cast: props.profiles,
            relationships: props.relationships || firstImpressionsMap(props.profiles),
            currentTribes,
            selectedPlayer: undefined,
            swapButtonActive: false,
        };
    }

    private initalizeTribes(profiles: PlayerProfile[], initialTribes: Tribe[]): { [id: number]: Tribe } {
        const ids: number[] = [...profiles.keys()];
        const shuffledIds = shuffle(ids);
        const result: { [id: number]: Tribe } = {};
        shuffledIds.forEach((id, i) => {
            const tribe = initialTribes[i % initialTribes.length];
            result[id] = tribe;
        });
        return result;
    }

    public componentDidMount() {
        this.subs.push(
            selectedPlayer$.subscribe({
                next: (player) => {
                    if (
                        this.state.swapButtonActive &&
                        isWellDefined(player) &&
                        isWellDefined(this.state.selectedPlayer) // probably redundant but it's only one boolean
                    ) {
                        const state = { ...this.state };
                        const hero = state.cast[this.state.selectedPlayer || 0]; // its never 0
                        const villain = state.cast[player!.id];
                        const tempImage = hero.imageURL;
                        const tempName = hero.name;
                        hero.imageURL = villain.imageURL;
                        hero.name = villain.name;
                        villain.imageURL = tempImage;
                        villain.name = tempName;
                        selectPlayer(null);
                        return;
                    }

                    const swapButtonActive = false;
                    this.setState({ selectedPlayer: player?.id, swapButtonActive });
                },
            }),
            relationshipUpdate$.subscribe({
                next: (update) => {
                    const { hero, villain, strength, romance, locked } = update;

                    console.log(`STREAM RECEIVED -> Updating Hero: ${hero} | Villain: ${villain}`);
                    const strengthValue = Math.max(-100, Math.min(100, strength));
                    const romanceValue = Math.max(0, Math.min(100, romance));
                    
                    this.setState((prevState) => {
                        const currentHeroRow = prevState.relationships[hero] || {};
                        const currentTargetData = currentHeroRow[villain] || {};

                        return {
                            ...prevState,
                            relationships: {
                                ...prevState.relationships,
                                [hero]: {
                                    ...currentHeroRow,
                                    [villain]: {
                                        ...currentTargetData,
                                        strength: strengthValue,
                                        romance: romanceValue,
                                        locked
                                    }
                                }
                            }
                        };
                    });
                },
            })
        );
    }

    public componentWillUnmount() {
        this.subs.forEach((sub) => sub.unsubscribe());
    }

    public render() {
        const props = this.props;
        const profiles = getProfiles(
            this.state.cast,
            this.state.relationships,
            this.state.currentTribes,
            true,
            this.state.swapButtonActive,
        );
        const someoneSelected = isWellDefined(this.state.selectedPlayer);

        const selectedName = someoneSelected ? this.state.cast[this.state.selectedPlayer!].name : [""]
        // no one selected: Select a houseguest to edit their relationships
        // someone selected but swap button not active: Select a houseguest to edit their relationships
        // swap button active: Select a houseguest to swap with
        const helpText = someoneSelected
            ? this.state.swapButtonActive
                ? "Select a houseguest to swap with."
                : `Select another houseguest to edit their relationship with ${listFullName(selectedName)}.`
            : `Select a houseguest to edit their relationships${
                  props.initialTribes?.length ? " and change their team" : ""
              }.`;

        const tribeChoices = props.initialTribes?.map((tribe) => (
            <div
                className="dropdown-item"
                style={{
                    backgroundColor: tribe.color,
                    color: textColor(tribe.color),
                    minHeight: "2rem",
                    cursor: "pointer",
                }}
                key={tribe.tribeId}
                onClick={() => {
                    // if someone is selected, change their tribe
                    if (isWellDefined(this.state.selectedPlayer)) {
                        const newState = { ...this.state };
                        newState.currentTribes[this.state.selectedPlayer!] = tribe;
                        this.setState(newState);
                        selectPlayer(null);
                    }
                }}
            >
                {tribe.name}
            </div>
        ));
        const disabledStyle = someoneSelected ? {} : { opacity: 0.5, cursor: "not-allowed" };
        return (
            <HasText>
                <MemoryWall splits={[{ houseguests: profiles }]} />
                <CenteredBold>{helpText}</CenteredBold>
                <div className="buttons is-centered">
                    <button
                        className={`button is-warning`}
                        onClick={() => {
                            this.setState({ relationships: firstImpressionsMap(props.profiles) });
                            selectPlayer(null);
                        }}
                    >
                        Random All
                    </button>
                    <button
                        className={`button is-primary ${this.state.swapButtonActive ? `is-light` : ``}`}
                        disabled={!someoneSelected}
                        onClick={() => {
                            this.setState({ swapButtonActive: !this.state.swapButtonActive });
                        }}
                    >
                        {this.state.swapButtonActive ? "Cancel" : "Swap"}
                    </button>
                    {!!this.props.initialTribes?.length && (
                        <div className={`dropdown ${someoneSelected ? "is-hoverable" : ""} is-up`}>
                            <div className="dropdown-trigger">
                                <button className="button" style={disabledStyle}>
                                    <span>Change Team</span>
                                    <span className="icon is-small">^</span>
                                </button>
                            </div>
                            <div className="dropdown-menu">
                                <div className="dropdown-content" style={{ padding: 0 }}>
                                    {tribeChoices}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {props.profiles.length === 0 ? (
                    ""
                ) : (
                    <button
                        className="button is-success"
                        onClick={async () => {
                            overwriteCast(this.state.cast, {
                                relationships: this.state.relationships,
                                initialTribes: this.props.initialTribes,
                                currentTribes: this.state.currentTribes,
                            });
                            selectPlayer(null);
                            // i removed the unncessary awaits. i think it's fine now?
                            newEpisode(null);
                            await Promise.resolve();
                            newEpisode(
                                new PregameEpisode(
                                    new GameState({
                                        players: getCast(),
                                        jury: getLastJurySize(),
                                        finalists: getLastFinalistSize(),
                                        hohPlaysVeto: getLastHoHPlaysVeto(),
                                    })
                                )
                            );
                            pushToMainContentStream(
                                <PregameScreen cast={this.state.cast} options={this.state} />,
                                Screens.Ingame
                            );
                        }}
                    >
                        Submit
                    </button>
                )}
            </HasText>
        );
    }
}

export function getProfiles(
    cast: PlayerProfile[],
    relationships: Record<number, Record<number, Relationships>>,
    currentTribes: { [id: number]: Tribe },
    editable: boolean,
    ignoreSelected: boolean
) {
    const totalGuests = cast.length;

    const _profiles = cast.map((profile, i) => {
        const myRelationships: Relationships[] = [];
        const heroRelationships = relationships[i];

        if (heroRelationships) {
            for (let villainId = 0; villainId < totalGuests; villainId++) {
                if (i === villainId) continue;
                
                const relationship = heroRelationships[villainId];
                if (relationship) {
                    myRelationships.push(relationship);
                }
            }
        }
        
        const housePopularity = myRelationships.length > 0 
            ? myRelationships.reduce((a, b) => a + (b.strength ?? 0), 0) / myRelationships.length 
            : 0;

        return {
            ...profile,
            housePopularity,
            tribe: currentTribes[i],
            editable,
            id: i,
        };
    });

    const profiles = _profiles.map((hero, i) => {
        let friends = 0;
        let enemies = 0;
        
        const myLocalRelationships: Record<number, Relationships> = {};
        const heroRelationships = relationships[i];

        if (heroRelationships) {
            for (let villainId = 0; villainId < totalGuests; villainId++) {
                if (i === villainId) continue;

                const relationship = heroRelationships[villainId];
                
                if (relationship) {
                    if (!myLocalRelationships[villainId]) {
                        myLocalRelationships[villainId] = {};
                    }
                    
                    myLocalRelationships[villainId] = relationship;
                    
                    const villainProfile = _profiles[villainId];
                    if (!villainProfile) continue;

                    const type = classifyRelationship(
                        hero.housePopularity,
                        villainProfile.housePopularity,
                        relationship.strength ?? 0
                    );

                    if (type === RelationshipType.Friend) {
                        friends++;
                    } else if (type === RelationshipType.Enemy) {
                        enemies++;
                    }
                }
            }
        }

        return {
            ...hero,
            friends,
            enemies,
            ignoreSelected,
            relationships: myLocalRelationships,
        };
    });
    
    return profiles;
}

