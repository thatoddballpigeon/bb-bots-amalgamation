import { getPersonalityClass } from "../../components/playerPortrait/personalities";
import { Houseguest } from "../../model";

export function generateEvicteeExit(evictees: Houseguest[]): string {
    let text: string = "";
    evictees.forEach((evictee) => {
        let selectedText: string = `${Math.random() > 0.5 ? "walks out of the house" : "leaves the house"}`;
        const eN = evictee.preferredName();
        const temper = evictee.stats.temper;
        if (getPersonalityClass(evictee.personality) === "Lawful" && Math.random() < 0.25) selectedText += " in good spirits";
        else if (temper <= 3) selectedText = "gives an explosive speech and storms out of the house";
        else selectedText += ` ${temper > 7 ? "calmly" : "uneventfully"}`;
        text += `${eN} ${selectedText}. `;
    });
    return text.trim();
}