// Some common functions needed on the client side for game states derived from
// the crowdjudgedqtemplate

// Sound to play on answer given:
const bell_sound = new Audio("/audio/goeman_bell.wav");
let answer_count = 0;   // Keeping track of num answers given to detect change

/**
 * Crowd Judged rounds will (probably all) have to show on the bigscreen:
 * 1) The name of the current active player, so he/she also knows its his/her
 * turn;
 * 2) The list of answers that were already given.
 * 
 * ❗**IMPORTANT:** This function has some stateful behavior :-( For playing a
 * bell sound when a new answer is added, it keeps track of the number of
 * answers given, such that it can detect when this increases. I should, of
 * course, have used `msg_old` for this, but this solution is much easier. 🤷🏻‍♂️
 * 
 * To prevent duplicate code, this handy method helps draw these for us
 * widget script.
 * @param msg The `detail.new_msg` object received within the event listener
 * @param list_id The `id` attribute of the unordered list to update the
 * contents of
 * @param ap_div_id The id of the div to put the name of the active player in.
 * This is an optional argument: if it is not given, we ignore drawing this.
 * @returns If all goes well, it returns a map linking answers (strings) to li
 * HTML elements, so the caller can still set some extra attributes, for example.
 */
export function crowdJudgedRedraw(msg: any, list_id: string, ap_div_id?: string) {
    const list_elem = document.getElementById(list_id);
    if (!list_elem)
        return;

    // Usually it should get an amap array of 3-tuples, but it should also work
    // when just giving it an array of answer strings:
    let amap: [string, number, number][] | undefined =
        msg?.general_info?.answer_map;
    if (!amap) {
        const answers: string[] | undefined = msg?.general_info?.answers;
        if (!answers)
            return;
        amap = answers.map(answ => [answ, 1, 0]);
    }


    const clone = list_elem.cloneNode(false);

    // Creating a map of li-elements so we can do things to it later:
    const liMap = new Map<string, HTMLLIElement>();
    
    for (const [answer, yVal, _] of amap) {
        const li = document.createElement("li");
        if (yVal === 1) {
            li.textContent = answer;
            liMap.set(answer, li);
        }
        else
            li.textContent = "-";
        clone.appendChild(li);
    }

    list_elem.parentElement?.replaceChild(clone, list_elem);

    // Play bell sound if an answer was just marked correct.
    const new_count = amap.filter(a => a[1] === 1).length;
    if (new_count !== 0 && new_count !== answer_count) {
        bell_sound.currentTime = 0; // Needed for if rapidly triggered twice
        bell_sound.play().catch(r => {});   // Don't care if it doesn't work 🤷🏻‍♂️
    }
    answer_count = new_count;

    // Draw the name of the active player (optional):
    if (!ap_div_id || !msg?.general_info?.active_player)
        return liMap;
    
    const name_elem = document.getElementById(ap_div_id);
    if (!name_elem)
        return liMap;
    
    name_elem.textContent = msg.general_info.active_player;

    return liMap;
}