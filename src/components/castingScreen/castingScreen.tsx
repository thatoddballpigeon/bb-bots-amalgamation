import "../playerPortrait/charCard.scss";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import FileDrop from "react-file-drop";
import { PlayerProfile } from "../../model";
import { CharacterCard } from "../playerPortrait/characterCard";
import { shuffle } from "lodash";
import { RandomButton } from "./randomXButton";
import { LoadJSONButton } from "./loadJSONButton";
import { selectCastPlayer } from "../playerPortrait/selectedPortrait";
import { pushToMainContentStream, selectedCastPlayer$, overwriteCast } from "../../subjects/subjects";
import { HasText } from "../layout/text";
import { Centered } from "../layout/centered";
import { Subscription } from "rxjs";
import { HelpLink } from "../episode/allianceList";
import { SeasonEditorPage } from "../seasonEditor/seasonEditorPage";
import { Screens } from "../topbar/topBar";
import { Intruder, SecretTwin, StatsMap, newStatsMap, randomInt, toggleIntruder, toggleSecretTwin } from "../../utils";
import { ARCHETYPES } from "../playerPortrait/archetypes";
import { PERSONALITIES } from "../playerPortrait/personalities";
import { AddHouseguestButton } from "./addHouseguestButton";
import { defaultGenderAttraction } from "../../utils/alliances";
import { FAME, Popularity, toggleCustomPop, toggleFame } from "../../utils/popularity";
import { useFormHandlers } from "../playerPortrait/utilities/ccFormHandlers";

interface CastingScreenProps {
    cast?: PlayerProfile[];
}

export interface CharacterSheetData {
    imageURL?: string,
    name?: string[],
    alias?: string,
    gender?: string,
    age?: number,
    hometown?: string,
    occupation?: string,
    personality?: string,
    archetype?: string,
    stats?: StatsMap,
    traits?: number[];
    intruder?: Intruder,
    secretTwin?: SecretTwin,
    popularity?: Popularity,
    disableShowmances?: boolean,
    attractedTo?: string[],
    castingScreenId?: number
}

interface TwinOption {
    id: number;
    name: string;
}

interface PlayersContextType {
    players: PlayerProfile[];
    twinOptionsMap: { id: number; name: string; }[];
}

export interface CheckboxOptions {
    gender: string;
}

let id = 1;

const PlayersContext = createContext<PlayersContextType | undefined>(undefined);
export const usePlayers = () => {
    const context = useContext(PlayersContext);
    if (!context) {
        return { players: [], twinOptionsMap: [] };
    }
    return context;
};

export function CastingScreen({ cast, ...props }: CastingScreenProps) {
    const [players, setPlayers] = useState<PlayerProfile[]>(() => {
        if (cast) {
            selectCastPlayer(null);
            cast.forEach((player) => {
                player.castingScreenId = id++;
            });
            return [...cast];
        }
        return [];
    });
    const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(() => new Set<number>());

    useEffect(() => {
        const sub = selectedCastPlayer$.subscribe((nextSelectedPlayers) => {
            setSelectedPlayers(nextSelectedPlayers);
        });

        return () => sub.unsubscribe();
    }, []);

    const twinOptionsMap = useMemo(() => {
        return players.map((p, idx) => {
            const nameStr = Array.isArray(p.name) 
                ? p.name.join(" ").trim() 
                : (p.name || `Contestant ${idx + 1}`);
            return { id: idx ?? -1, name: nameStr };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [players]);

    const handleDrop = (files: FileList | null) => {
        if (!files) return;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type !== 'application/json') continue;
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                try {
                    const result = e.target?.result as string;
                    handleJSON(result);
                } catch (error) {
                    console.error("Invalid JSON file format:", error);
                    alert("Failed to import JSON file. File type/format may be incorrect.");
                } finally {
                    reader.onload = null;
                };
            };
            reader.readAsText(file);
        }
    };

    const handleJSON = useCallback((file: string) => {
        try {
            const json = JSON.parse(file);
            if (!Array.isArray(json)) return;

            setPlayers((prevPlayers) => {
                const updatedPlayers = [...prevPlayers];
                const indexOffset = prevPlayers.length; 
                const newlyAddedPlayers: PlayerProfile[] = [];

                for (let i = 0; i < json.length; i++) {
                    const data = json[i];
                    const player = newPlayer(data);
                    
                    updatedPlayers.push(player);
                    newlyAddedPlayers.push(player);
                }

                for (let i = 0; i < json.length; i++) {
                    const data = json[i];
                    const importedTwinIndex = data.secretTwin.twinPartner;
                    const globalPlayerIndex = indexOffset + i;
                    const player = updatedPlayers[globalPlayerIndex];
                    if (
                        player.secretTwin.isTwin && 
                        typeof importedTwinIndex === "number" && 
                        importedTwinIndex >= 0 && 
                        importedTwinIndex < json.length
                    ) {
                        const globalPartnerIndex = indexOffset + importedTwinIndex;
                        const partner = updatedPlayers[globalPartnerIndex - 1];
                        player.secretTwin.twinPartner = globalPartnerIndex - 1;
                    }
                }
                return updatedPlayers;
            });
        } catch (error) {
            console.error("Failed to parse cast JSON file:", error);
        }
    }, []);

    const handleDownloadJSON = () => {
        let url = "";
        const jsonName: string | null = prompt(`Enter a name for your JSON save file.`);
        if (jsonName === null) {
            alert("JSON must have a name.");
            return;
        }
        try {
            const jsonString = JSON.stringify(players, (key, value) => {
                if (key === "castingScreenId" || key === "idNum") return undefined; // who CARES about this bro
                return value;
            }, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${jsonName}.json`;
            
            document.body.appendChild(link);
            link.click();
            
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export JSON file:", error);
        } finally {
            if (url) URL.revokeObjectURL(url);
        }
    };

    const handleUploadJSON = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const files = target?.files;
        if (!files || files.length === 0) return;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                try {
                    const result = e.target?.result as string;
                    handleJSON(result);
                } catch (error) {
                    console.error("Invalid JSON file format:", error);
                    alert("Failed to import JSON file. File type/format may be incorrect.");
                } finally {
                    reader.onload = null;
                }
            };
            reader.readAsText(file);
        };
    };

    const addPlayers = useCallback((_amount: number) => {
        setPlayers((prevPlayers) => {
            const updatedPlayers = [...prevPlayers];
            for (let i = 0; i < _amount; i++) updatedPlayers.push(newPlayer());
            return updatedPlayers;
        });
    }, []);

    const newPlayer = (data: Partial<CharacterSheetData> = {}): PlayerProfile => {
        return {
            imageURL: "",
            name: ["", "", ""],
            alias: "",
            gender: "Female",
            age: randomInt(18, 80),
            hometown: "",
            occupation: "",
            personality: PERSONALITIES[0].name,
            archetype: ARCHETYPES[0].name,
            stats: newStatsMap(),
            traits: [0, 0, 0, 0, 0, 0, 0, 0],
            intruder: { isIntruder: false, introWeek: 2 },
            disableShowmances: false,
            attractedTo: defaultGenderAttraction("Female"),
            ...data,
            // more, MORE SPREADING...
            secretTwin: {
                isTwin: false,
                isPrimaryTwin: false,
                twinPartner: null,
                twinEntryEpisode: 5,
                twinEntryCancelled: false,
                ...data.secretTwin
            },
            popularity: { 
                fame: null, 
                popularity: 50,
                ...data.popularity
            },
            castingScreenId: id++,
        };
    }

    const handleImageURL = useCallback((index: number) => {
        const newImage = prompt(`Enter a new image URL. Can be Base64, but it'll cost you.`);
        if (!newImage) return;
        setPlayers((prevPlayers) => {
            if (!prevPlayers[index]) return prevPlayers;

            const updatedPlayers = [...prevPlayers];
            let player = updatedPlayers[index];
            updatedPlayers[index] = {
                ...player,
                imageURL: newImage
            };
            return updatedPlayers;
        });
    }, []);

    const handleClick = useCallback((castingScreenId: number) => {
        selectCastPlayer(castingScreenId);
    }, []);

    const handleDelete = useCallback((index: number, castingScreenId: number): void => {
        setPlayers((prevPlayers) => {
            const updatedPlayers = [...prevPlayers];
            const targetIndex = index - 1;
            updatedPlayers.splice(targetIndex, 1);
            for (let i = 0; i < updatedPlayers.length; i++) {
                const player = updatedPlayers[i];
                const secretTwin = player.secretTwin;
                const partnerIndex = secretTwin.twinPartner;

                if (secretTwin.isTwin && typeof partnerIndex === "number") {
                    if (partnerIndex === targetIndex) {
                        updatedPlayers[i] = {
                            ...player,
                            secretTwin: {
                                ...secretTwin,
                                isTwin: false,
                                isPrimaryTwin: false,
                                twinPartner: null,
                                twinEntryEpisode: null
                            }
                        };
                    } else if (partnerIndex > targetIndex) {
                        updatedPlayers[i] = {
                            ...player,
                            secretTwin: {
                                ...secretTwin,
                                twinPartner: partnerIndex - 1
                            }
                        };
                    }
                }
            }
            return updatedPlayers;
        });

        setSelectedPlayers((prevSelected) => {
            if (prevSelected.has(castingScreenId)) {
                selectCastPlayer(castingScreenId); 

                const updatedSelected = new Set(prevSelected);
                updatedSelected.delete(castingScreenId);
                return updatedSelected;
            }
            return prevSelected;
        });
    }, []);

    const handleRename = useCallback((index: number, type: number, value: string | null) => {
        setPlayers((prevPlayers) => {
            if (!prevPlayers[index]) return prevPlayers;
            const updatedPlayers = [...prevPlayers];
            const player = updatedPlayers[index];

            const updatedName = [...player.name];
            updatedName[type] = value ?? "";

            updatedPlayers[index] = {
                ...player,
                name: updatedName
            };

            return updatedPlayers;
        });
    }, []);

    const handleStatChange = useCallback((id: string, index: number, stat: string, newStatValue: number) => {
        setPlayers((prevPlayers) => {
            if (!prevPlayers[index]) return prevPlayers;
            const updatedPlayers = [...prevPlayers];
            const currentPlayer = updatedPlayers[index];
            if (id === "stats") {
                updatedPlayers[index] = {
                    ...currentPlayer,
                    stats: {
                        ...currentPlayer.stats,
                        [stat]: newStatValue,
                    },
                };
            } else if (id === "traits") {
                const traitIndex = parseInt(stat, 10);
                const updatedTraits = [...currentPlayer.traits];
                updatedTraits[traitIndex] = (newStatValue / 50) - 1;
                updatedPlayers[index] = {
                    ...currentPlayer,
                    traits: updatedTraits,
                };
            }
            return updatedPlayers;
        });
    }, []);

    const handleStringChange = useCallback((index: number, key: string, value: string | null) => {
        setPlayers((prevPlayers) => {
            if (!prevPlayers[index]) return prevPlayers;
            const updatedPlayers = [...prevPlayers];
            const player = updatedPlayers[index];
            switch (key) {
                case "popularity":
                    updatedPlayers[index] = {
                        ...player,
                        [key as keyof Popularity]: value ?? ""
                    };
                    break;
                case "fame":
                    const fameValue = value as keyof typeof FAME;
                    if (!FAME[fameValue]) return prevPlayers;
                    updatedPlayers[index] = {
                        ...player,
                        popularity: {
                            ...player.popularity,
                            fame: value,
                            startPopularity: typeof player.popularity.startPopularity === 'number' && !player.popularity._popTouched
                                ? FAME[fameValue].start
                                : player.popularity.startPopularity
                        }
                    };
                    break;
                default:
                    updatedPlayers[index] = { ...player, [key]: value ?? "" };
                    break;
            }
            return updatedPlayers;
        });
    }, []);

    const handleNumberChange = useCallback((index: number, type: string, newNumber: number) => {
        setPlayers((prevPlayers) => {
            if (!prevPlayers[index]) return prevPlayers;

            let updatedPlayers = [...prevPlayers];
            const player = updatedPlayers[index];
            switch (type) {
                case "age":
                    updatedPlayers[index] = {
                        ...player,
                        age: newNumber
                    };
                    break;
                case "intruderEntry":
                    updatedPlayers[index] = {
                        ...player,
                        intruder: {
                            ...player.intruder,
                            introWeek: newNumber
                        }
                    };
                    break;
                case "twinEntryWeek":
                    updatedPlayers[index] = {
                        ...player,
                        secretTwin: {
                            ...player.secretTwin,
                            twinEntryEpisode: newNumber
                        }
                    };
                    break;
                case "twinPartner":
                    const partner = newNumber;
                    if (partner !== -1) {
                        for (let j = 0; j < updatedPlayers.length; j++) {
                            if (j === index) continue;
                            
                            const other = updatedPlayers[j];
                            const secretTwin = other.secretTwin;
                            
                            if (secretTwin.isTwin && (secretTwin.twinPartner === index || secretTwin.twinPartner === partner)) {
                                if (secretTwin.twinPartner === partner) {
                                    updatedPlayers[j] = {
                                        ...other,
                                        secretTwin: {
                                            ...secretTwin,
                                            isTwin: false,
                                            isPrimaryTwin: false,
                                            twinPartner: null,
                                            twinEntryEpisode: null
                                        }
                                    };
                                }
                            }
                        }
                    }

                    updatedPlayers[index] = {
                        ...updatedPlayers[index],
                        secretTwin: {
                            ...updatedPlayers[index].secretTwin,
                            twinPartner: partner
                        }
                    };
                    break;
                case "customPopularity":
                    updatedPlayers[index] = {
                        ...player,
                        popularity: {
                            ...player.popularity,
                            _popTouched: true,
                            startPopularity: Math.max(0, Math.min(100, newNumber || 0))
                        }
                    };
                    break;
                default:
                    break;
            }
            return updatedPlayers;
        });
    }, []);

    const handleCheckboxToggle = useCallback((index: number, type: string, newBoolean: boolean, options?: CheckboxOptions) => {
        setPlayers((prevPlayers) => {
            if (!prevPlayers[index]) return prevPlayers;

            const updatedPlayers = [...prevPlayers];
            let player = updatedPlayers[index];
            switch (type) {
                case "disableShowmances":
                    updatedPlayers[index] = {
                        ...player,
                        disableShowmances: newBoolean
                    };
                    break;
                case "attractedTo":
                    if (!options) return prevPlayers;
                    const currentAttraction = player.attractedTo 
                        ? [...player.attractedTo] 
                        : defaultGenderAttraction(player.gender);

                    const idx = currentAttraction.indexOf(options.gender);
                    if (newBoolean && idx === -1) currentAttraction.push(options.gender);
                    else if (!newBoolean && idx !== -1) currentAttraction.splice(idx, 1);

                    updatedPlayers[index] = {
                        ...player,
                        attractedTo: currentAttraction
                    };
                    break;
                case "secretTwin":
                    updatedPlayers[index] = toggleSecretTwin(player, newBoolean);
                    break;
                case "intruder":
                    updatedPlayers[index] = toggleIntruder(player, newBoolean);
                    break;
                case "fame":
                    updatedPlayers[index] = toggleFame(player, newBoolean);
                    break;
                case "popularity":
                    updatedPlayers[index] = toggleCustomPop(player, newBoolean);
                    break;
                default:
                    break;
            }
            return updatedPlayers;
        });
    }, []);

    const submit = () => {
        overwriteCast(players);
        pushToMainContentStream(<SeasonEditorPage />, Screens.Season);
    };

    const random = useCallback((_amount: number) => {
        setPlayers((prevPlayers) => {
            // get all the selected players first
            let result: PlayerProfile[] = [];
            let amount = _amount;
            let unselectedPlayers: PlayerProfile[] = [];

            prevPlayers.forEach((player) => {
                if (selectedPlayers.has(player.castingScreenId || -1)) {
                    result.push(player);
                    amount--;
                } else {
                    unselectedPlayers.push(player);
                }
            });

            if (amount > 0) {
                unselectedPlayers = shuffle(unselectedPlayers);
                unselectedPlayers = unselectedPlayers.slice(0, amount);
            }
            let updatedPlayers = amount > 0 ? result.concat(unselectedPlayers) : result;
            return shuffle(updatedPlayers);
        });
    }, [selectedPlayers]);
    
    const handlers = useFormHandlers({
        handleImageURL,
        handleClick,
        handleDelete,
        handleRename,
        handleStatChange,
        handleCheckboxToggle, 
        handleNumberChange, 
        handleStringChange 
    });

    const noPlayers = players.length === 0;
    return (
        <FileDrop onDrop={handleDrop}>
            <HasText className="level">
                <div className="level-item">
                    <button
                        className="button is-danger"
                        onClick={() => {
                            id = 1;
                            setPlayers([]);
                            selectCastPlayer(null);
                        }}
                    >
                        Delete all
                    </button>
                </div>
                <div className="level-item">
                    <button
                        className="button is-danger"
                        disabled={selectedPlayers.size === 0}
                        onClick={() => {
                            const updated = players.filter(
                                (player) => !selectedPlayers.has(player.castingScreenId || -1)
                            );
                            setPlayers(updated);
                            selectCastPlayer(null);
                        }}
                    >
                        Delete selected
                    </button>
                </div>
                <div className="level-item">
                    <button
                        className="button is-warning"
                        onClick={() => selectCastPlayer(null)}
                        disabled={selectedPlayers.size === 0}
                    >
                        Unselect {selectedPlayers.size || "all"}
                    </button>
                </div>
                <div className="level-item">
                    <AddHouseguestButton addPlayers={addPlayers}/>
                </div>
                <div className="level-item">
                    <RandomButton players={players.length} random={random} />
                </div>
                <div className="level-item">
                    <button
                        className="button is-success"
                        disabled={players.length < 2
                            || players.some(player => 
                                (player.name[0].trim() === "" && player.alias.trim() === "")
                                || Object.values(player.stats).reduce((sum: number, val: number) => sum + val, 0) > 30)}
                        onClick={submit}
                    >
                        Next
                    </button>
                </div>
            </HasText>
            <br />
            <HasText className="level">
                <div className="level-item">
                    <button
                        className="button"
                        disabled={noPlayers || players.some(player => Object.values(player.stats).reduce((sum: number, val: number) => sum + val, 0) > 30)}
                        onClick={handleDownloadJSON}
                    >
                        Save cast
                    </button>
                </div>
                <div className="level-item">
                    <LoadJSONButton onChange={handleUploadJSON} />
                </div>
            </HasText>
            {noPlayers ? (
                <Centered>
                    ~ Drop JSONs here ~
                    <br />
                    <br />
                    <HelpLink
                        href="https://github.com/spaulmark/bb-bots/blob/master/README.md#choose-a-cast-of-characters"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Need help setting up a game?
                    </HelpLink>
                </Centered>
            ) : (
                <PlayersContext.Provider value={{ players, twinOptionsMap }}>
                    <div className="cc-grid">
                        {players.map((player: PlayerProfile, index: number) => {
                            const id = player.castingScreenId ?? -1;
                            const selected = selectedPlayers.has(id);
                            return (
                                <CharacterCard
                                    key={`character-card-${id}`}
                                    player={player}
                                    index={index + 1}
                                    selected={selected}
                                    handlers={handlers}
                                    twinOptions={twinOptionsMap}
                                />
                            );
                        })}
                    </div>
                </PlayersContext.Provider>
            )}
        </FileDrop>
    );
}
