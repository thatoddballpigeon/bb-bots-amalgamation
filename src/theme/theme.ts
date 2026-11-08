export interface ColorTheme {
    name: string;
    bg: string;
    text: string;
    toggleBorder: string;
    bodyArea: string;
    bodyAreaBorder: string;
    link: string;
    mark: string;
    overlay: string;
    overlayBorder: string;
    evictedCell: string;
    grayCell: string;
    winnerCell: string;
    lightGrayCell: string;
    runnerUpCell: string;
    saveCell: string;
    nomineeCell: string;
    hohCell: string;
    portraitBorder: string;
    tableCellBorder: string;
}

// export const lightTheme: ColorTheme = {
//     name: "light",
//     bg: "#fff",
//     text: "#363537",
//     toggleBorder: "#FFF",
//     bodyArea: "#fff",
//     link: "blue",
//     mark: "yellow",
//     overlay: "fff",
//     evictedCell: "#fa8072",
//     grayCell: "#eaecf0",
//     lightGrayCell: "#f8f9fa",
//     winnerCell: "#73fb76",
//     runnerUpCell: "#d1e8ef",
//     nomineeCell: "#959ffd",
//     hohCell: "#CCFFCC",
//     portraitBorder: "gray",
//     tableCellBorder: "#a2a9b1",#2333a9
// };

export const darkTheme: ColorTheme = {
    name: "dark",
    bg: "#30629a",
    saveCell: "#334d5e",
    text: "#FAFAFA",
    bodyArea: "#00295e",
    bodyAreaBorder: "#049be6",
    toggleBorder: "#6B8096",
    link: "lightblue",
    mark: "#7e006d",
    overlay: "#3076a5",
    overlayBorder: "#8bf0ff",
    evictedCell: "#9d4c43",
    grayCell: "#5e5e5e",
    lightGrayCell: "#404040",
    runnerUpCell: "#9fbec882",
    nomineeCell: "#6c75d0",
    winnerCell: "#00ac04",
    hohCell: "#3f783f",
    portraitBorder: "#e86775",
    tableCellBorder: "#53575b",
};
