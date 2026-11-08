//FIXME: get a more dynamic way of retrieving images (might have to use github for this one chief :sob:)
import backyard from '../../../images/backyard.jpg';
import bathroom from '../../../images/bathroom.jpg';
import bedroom from '../../../images/bedroom.jpg';
import diaryRoom from '../../../images/diaryroom.jpg';
import hohRoom from '../../../images/headofhouseholdroom.jpg';
import kitchen from '../../../images/kitchen.jpg';
import livingRoom from '../../../images/livingroom.png';
import lounge from '../../../images/lounge.jpg';
import storageRoom from '../../../images/storageroom.jpg';

const LOCATIONS = {
    backyard: backyard,
    bathroom: bathroom,
    bedroom: bedroom,
    diaryroom: diaryRoom,
    headofhouseholdroom: hohRoom,
    kitchen: kitchen,
    livingroom: livingRoom,
    lounge: lounge,
    storageroom: storageRoom
};

export function getEventBackgroundImage(location?: string) {
    if (!location) return;
    const string = location.toLowerCase().replace(/\s/g, '');
    return LOCATIONS[string as keyof typeof LOCATIONS];
}
