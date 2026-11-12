import { Subscription } from "rxjs";
import { Sidebar } from "./sidebar";
import { EpisodeLibrary, Season } from "../../model/season";
import { Episode, nonEvictedHouseguests, getHouseguestById } from "../../model";
import { Scene } from "../episode/scenes/scene";
import {
    episodes$,
    switchEpisode$,
    newEpisode,
    switchSceneRelative,
    getSelectedPlayer,
    selectedPlayer$,
    displayMode$,
    season$,
    pushToMainContentStream,
} from "../../subjects/subjects";
import { popularityMode } from "../../model/portraitDisplayMode";
import { activeScreen$, Screens } from "../topbar/topBar";
import { computeEpisodeRating } from "../episode/utilities/tvRatings";

interface IndexedScene {
    scene: Scene;
    index: number;
}

const LEFT = 37;
const RIGHT = 39;

export class SidebarController {
    private view: Sidebar;
    private _isProcessing: boolean = false;
    private subscriptions: Subscription[] = [];
    private season: Season = new Season();
    private scenes: IndexedScene[] = [];
    private selectedEpisode: number = 0;

    public constructor(view: Sidebar) {
        this.view = view;
        this.subscriptions.push(
            activeScreen$.subscribe((screen) => {
                this.view.setState({ selectionsActive: screen === Screens.Ingame });
            })
        );
        this.subscriptions.push(
            episodes$.subscribe({
                next: (episode) => this.onNewEpisode(episode),
            })
        );
        this.subscriptions.push(
            switchEpisode$.subscribe({
                next: (value: number) => {
                    this.switchSceneRelative(value);
                },
            })
        );
        this.subscriptions.push(
            season$.subscribe({
                next: (library: EpisodeLibrary) => {
                    this.season = new Season(library);
                    this.selectedEpisode = 0;
                    displayMode$.next(popularityMode);
                },
            })
        );
    }

    public getSelectedEpisode() {
        return this.selectedEpisode;
    }

    public async switchToScene(id: number) {
        pushToMainContentStream(this.scenes[id].scene.render, Screens.Ingame);
        this.selectedEpisode = this.scenes[id].index;
        await this.view.setState({ selectedScene: id });
        if (getSelectedPlayer() !== null) {
            const gameState = this.scenes[this.view.state.selectedScene].scene.gameState;
            selectedPlayer$.next(
                getHouseguestById(gameState, getSelectedPlayer()!.id)
            );
        }
    }

    private switchSceneRelative = async (delta: number) => {
        if (this._isProcessing) return;
        const selectedScene = this.view.state.selectedScene;
        const renderedScenes = this.scenes.length;
        const targetScene = selectedScene + delta;
        if (targetScene < 0) {
            return;
        }
        const lastEpisode = this.view.state.episodes[this.view.state.episodes.length - 1];
        if (targetScene < renderedScenes) {
            // Go back to an earlier scene
            this.switchToScene(targetScene);
        } else if (targetScene === renderedScenes) {
            // Generate a new scene, then jump to it
            this._isProcessing = true;
            const currentGameState = lastEpisode.gameState;
            const newPlayerCount = nonEvictedHouseguests(lastEpisode.gameState).length;
            if (newPlayerCount > 0) {
                setTimeout(() => {
                    if (this.view.state.selectedScene !== selectedScene) {
                        this._isProcessing = false;
                        return;
                    }
                    if (currentGameState.log[currentGameState.episode]) {
                        computeEpisodeRating(currentGameState);
                    }
                    console.time("SimMath");
                    const generatedEpisode = this.season.renderEpisode(currentGameState);
                    newEpisode(generatedEpisode);
                    console.timeEnd("SimMath");
                    requestAnimationFrame(() => {
                        this._isProcessing = false;
                        if (targetScene <= this.scenes.length) this.switchToScene(targetScene);
                    });
                }, 100);
            } else {
                this._isProcessing = false;
            }
        }
    };

    get handleKeyDown(): (e: any) => void {
        return this._handleKeyDown.bind(this);
    }

    private _handleKeyDown(event: any) {
        if (this._isProcessing) return;
        const state = this.view.state;
        if (
            state.episodes[this.selectedEpisode] === undefined ||
            state.episodes[this.selectedEpisode].type.arrowsDisabled ||
            activeScreen$.value !== Screens.Ingame
        ) {
            return;
        }
        if (event.keyCode === LEFT) {
            switchSceneRelative(-1);
        } else if (event.keyCode === RIGHT) {
            switchSceneRelative(1);
        }
    }

    private onNewEpisode(episode: Episode | null) {
        if (!episode) {
            this.view.setState({ episodes: [], selectedScene: 0 });
            this.scenes = [];
        } else {
            const newState = { ...this.view.state };
            // starts at -1: prevent OBOE
            const latestIndex = this.scenes.length === 0 ? -1 : this.scenes[this.scenes.length - 1].index;
            const index = latestIndex + 1;
            this.scenes.push({ scene: episode, index });
            episode.scenes.forEach((scene) => this.scenes.push({ scene, index }));
            newState.episodes.push(episode);
            this.view.setState(newState);
        }
    }

    public destroy() {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }
}
