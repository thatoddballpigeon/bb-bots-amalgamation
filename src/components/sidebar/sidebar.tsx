import React from "react";
import { SidebarController } from "./sidebarController";
import { PregameEpisode } from "../episode/pregameEpisode";
import { defaultJurySize, Episode, GameState, PlayerProfile } from "../../model";
import { Scene } from "../episode/scenes/scene";
import { newEpisode, overwriteCast, pushToMainContentStream } from "../../subjects/subjects";
import { BodyAreaBox } from "../layout/box";
import { HasText } from "../layout/text";
import { shuffle } from "lodash";
import { activeScreen$, Screens } from "../topbar/topBar";
import { baseUrl } from "../deckScreen/deckScreen";
import { newStatsMap, randomInt } from "../../utils";
import { PERSONALITIES } from "../playerPortrait/personalities";
import { ARCHETYPES } from "../playerPortrait/archetypes";
import { defaultGenderAttraction } from "../../utils/alliances";
interface SidebarState {
    episodes: Episode[];
    selectedScene: number;
    selectionsActive: boolean;
}

let firstLoad = true;

export class Sidebar extends React.Component<{}, SidebarState> {
    private controller: SidebarController;
    public constructor(props: {}) {
        super(props);
        this.controller = new SidebarController(this);
        this.state = { episodes: [], selectedScene: 0, selectionsActive: true };
    }
    public async componentDidMount() {
        document.addEventListener("keydown", this.controller.handleKeyDown);
        if (!firstLoad) {
            firstLoad = false;
            return;
        }
        let data = await (await fetch(`${baseUrl}/bb.json`)).json();
        const cast: PlayerProfile[] = [];
        data = shuffle(data).slice(0, 16);
        for (const player of data) {
            let name = player.substr(0, player.lastIndexOf(".")) || player;
            name = name.substr(name.indexOf("/") + 1) || name;
            cast.push({
                name: [name, "", ""],
                alias: "",
                imageURL: `${baseUrl}Big Brother ${player}.png`,
                gender: "Female",
                age: randomInt(18, 80),
                hometown: "",
                occupation: "",
                personality: PERSONALITIES[0].name,
                archetype: ARCHETYPES[0].name,
                stats: newStatsMap(),
                traits: [0, 0, 0, 0, 0, 0, 0, 0],
                disableShowmances: false,
                attractedTo: defaultGenderAttraction("Female"),
                intruder: { isIntruder: false, introWeek: 0 },
                secretTwin: { isTwin: false, isPrimaryTwin: false, twinPartner: null, twinEntryEpisode: null },
                popularity: { fame: null, popularity: 50, startPopularity: undefined, _popTouched: false },
            });
        }

        const episode: Episode = new PregameEpisode(
            new GameState({ players: cast, jury: defaultJurySize(cast.length), finalists: 3 })
        );
        newEpisode(episode);
        overwriteCast(cast);
        if (activeScreen$.value === Screens.Ingame) {
            pushToMainContentStream(episode.render, Screens.Ingame);
        }
    }

    public componentWillUnmount() {
        this.controller.destroy();
    }

    public render() {
        return (
            <BodyAreaBox style={{ minWidth: 180, maxWidth: 250 }}>
                <HasText>{this.getEpisodes()}</HasText>
            </BodyAreaBox>
        );
    }

    private getHighlight(title: string, key: number) {
        if (key === this.state.selectedScene && this.state.selectionsActive) {
            return <mark>{title}</mark>;
        }
        return title;
    }

    private getEpisodes() {
        const result: JSX.Element[] = [];
        // Weird OBOE to make keys start at 0
        let episodeKey = -1;
        let breakKey = 0;
        this.state.episodes.forEach((episode: Episode) => {
            const id = ++episodeKey;
            result.push(
                <b
                    key={id}
                    onClick={() => {
                        this.controller.switchToScene(id);
                    }}
                >
                    {this.getHighlight(episode.title, id)}
                </b>
            );
            result.push(<br key={--breakKey} />);
            episode.scenes.forEach((scene: Scene) => {
                const id = ++episodeKey;
                if (this.controller.getSelectedEpisode() === episode.gameState.episode) {
                    result.push(
                        <a key={id} onClick={() => this.controller.switchToScene(id)}>
                            {this.getHighlight(scene.title, id)}
                        </a>
                    );
                    result.push(<br key={--breakKey} />);
                }
            });
        });
        return result;
    }
}
