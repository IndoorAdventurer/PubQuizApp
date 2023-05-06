// Some common functions needed on the client side for game states derived from
// the crowdjudgedqtemplate

/**
 * Crowd Judged rounds will (probably all) have to show on the bigscreen:
 * 1) The name of the current active player, so he/she also knows its his/her
 * turn;
 * 2) The list of answers that were already given.
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
    // Draw the list of given answers:
    if (!msg.general_info?.answers)
        return;
    
    const list_elem = document.getElementById(list_id);
    if (!list_elem)
        return;

    const answers: string[] = msg.general_info.answers;
    const clone = list_elem.cloneNode(false);

    // Creating this map so we can do things to it later
    const liMap = new Map<string, HTMLLIElement>();
    
    for (const answer of answers) {
        const li = document.createElement("li");
        li.textContent = answer;
        clone.appendChild(li);
        liMap.set(answer, li);
    }

    list_elem.parentElement?.replaceChild(clone, list_elem);


    // Draw the name of the active player (optional):
    if (!ap_div_id || !msg?.general_info?.active_player)
        return liMap;
    
    const name_elem = document.getElementById(ap_div_id);
    if (!name_elem)
        return liMap;
    
    name_elem.textContent = msg.general_info.active_player;

    return liMap;
}