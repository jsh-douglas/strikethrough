// - - - - - - - - - - - - - - - - - - -
//  Message Listeners
// - - - - - - - - - - - - - - - - - - -

if (typeof port === 'undefined') {
    window.port = chrome.runtime.connect({name: 'popupConnection'});

    port.onMessage.addListener(message => {
        switch (message.query) {
            case 'init':
                port.postMessage({query: 'initResponse', initResponse: init()});    
                break;

            case 'main':
                main();
                port.postMessage({query: 'mainComplete', displayedUsers: Array.from(displayedUsers), allUserData: allUserInfo});
                break;

            case 'getDisplayedUsers':
                port.postMessage({query: 'getDisplayedUsersResponse', displayedUsers: Array.from(displayedUsers)});
                break;

            case 'getAllUsers':
                port.postMessage({query: 'getAllUsersResponse', allUsers: Array.from(allUsers)});
                break;

            case 'getAllUserData':
                port.postMessage({query: 'getAllUserDataResponse', allUserData: allUserInfo});
                break;

            case 'toggleVisibility':
                userIndex = allUserInfo.findIndex(user => user.path === message.userPath); 
                allUserInfo[userIndex].hidden = !allUserInfo[userIndex].hidden;
                allUserInfo[userIndex].hidden ? hideUser(message.userPath, pageStyle.default) : showUser(message.userPath);
                break;

            case 'setColor':
                userIndex = allUserInfo.findIndex(user => user.path === message.userPath); 
                allUserInfo[userIndex].color = message.color;
                hideUser(message.userPath);
                break;

            case 'preciseTime':
                convertDates(message.format);
        } 
    });
}

port.postMessage({query: 'scriptLoaded'});

function init() {
    if (typeof initComplete === 'undefined') {
        // Prevent code repeating
        window.initComplete = true;

        // Element attributes used for selecting hyperlinks
        window.userLink = 'a.css-4rbku5.css-18t94o4.css-1dbjc4n.r-1loqt21.r-1wbh5a2.r-dnmrzs.r-1ny4l3l';
        window.profilePictureClass = 'css-4rbku5 css-18t94o4 css-1dbjc4n r-sdzlij r-1loqt21 r-1adg3ll r-ahm1il r-1ny4l3l r-1udh08x r-o7ynqc r-6416eg r-13qz1uu';

        // Declare users set
        window.allUsers = new Set();
        window.displayedUsers = new Set();
        window.allUserInfo = [];

        // Get styling
        chrome.storage.sync.get(['pageStyle'], result => {
            window.pageStyle = result.pageStyle;
        });
    } 
}

function main() {
    displayedUsers.clear();

    // Get all users present on page.
    document.querySelectorAll(userLink).forEach(hyperlink => {
        // Get each username for unique identification
        let userPath = (new URL(hyperlink.href)).pathname;
        allUsers.add(userPath);
        displayedUsers.add(userPath);
    });

    // Convert users set to array to allow for indexing with the forEach() function.
    Array.from(displayedUsers).forEach((userPath, index) => {
        // Check if user is present in allUserInfo
        const alreadyExists = allUserInfo.some(user => user.path === userPath);

        let userColor;
        // Check if user is present in allUserInfo
        if (alreadyExists) {
            // Update userColor
            const userInfo = allUserInfo.find(user => user.path === userPath);
            userColor = userInfo.color;
        } else {
            styleIndex = index;
            // Loop until an available color is found
            while (true) {
                // Check if styleIndex is out of range for predefined colors
                if (typeof pageStyle[styleIndex.toString()] === 'undefined') {
                    // Update userColor
                    userColor = pageStyle.default.backgroundColor;
                    break;
                } else {
                    // Set userColor to predefined color based on index
                    userColor = pageStyle[index.toString()].backgroundColor;
                    // Check if color is in use already
                    const colorUsed = allUserInfo.some(user => user.color === userColor);
                    // Loop if color is being used by another user
                    if (colorUsed) {
                        styleIndex += 1;
                    } else {
                        break;
                    }
                }
            }
            // Add user information to allUserInfo
            allUserInfo.push({ 'path': userPath, 'color': userColor, "hidden": true });
        }

        // Apply styling to all hyperlinks.
        hideUser(userPath);
    });

    port.postMessage({query: 'mainComplete'});
    // chrome.runtime.sendMessage({ query: 'popupInit', allUserInfo: allUserInfo, displayedUsers: Array.from(displayedUsers) });
}

// - - - - - - - - - - - - - - - - - - -
//  showUser() - Removes styling 
// - - - - - - - - - - - - - - - - - - -

function showUser(userPath) {
    document.querySelectorAll(`a[href='${userPath}']`).forEach(element => {
        // Show child elements.
        for (let i = 0; i < element.children.length; i++) {
            element.children[i].style.setProperty('opacity', 1);
        }

        // Remove Styling.
        element.style.removeProperty('background-color');
        element.style.removeProperty('border-radius');
        element.style.removeProperty('box-shadow');
        element.style.removeProperty('color');
    });
}

// - - - - - - - - - - - - - - - - - - -
//  hideUser() - Applies custom styling
// - - - - - - - - - - - - - - - - - - -

function hideUser(userPath) {
    const userInfo = allUserInfo.find(user => user.path === userPath);
    userColor = userInfo.color;
    document.querySelectorAll(`a[href='${userPath}']`).forEach(element => {
        // Hide child elements.
        for (let i = 0; i < element.children.length; i++) {
            element.children[i].style.setProperty('transition', pageStyle.all.transition);
            element.children[i].style.setProperty('opacity', 0);
        }

        // Apply Styling.
        element.style.setProperty('background-color', userColor);
        element.style.setProperty('box-shadow', pageStyle.all.boxShadow);
        element.style.setProperty('color', pageStyle.all.color);
        element.style.setProperty('transition', pageStyle.all.transition);


        // Profile pictures are circular and so have a border radius reflecting that.
        if (element.className === profilePictureClass) {
            element.style.setProperty('border-radius', '100%');
        } else {
            element.style.setProperty('border-radius', pageStyle.all.borderRadius);
        }
    });
}

// - - - - - - - - - - - - - - - - - - -
//  convertDates() - Switches between time formats
// - - - - - - - - - - - - - - - - - - -

function convertDates(format) {
    const times = document.getElementsByTagName('time');
    for (let i = 0; i < times.length; i++) {
        if (format === 'precise') {
            times[i].setAttribute('timeSince', times[i].innerHTML);
            times[i].innerHTML = (new Date(times[i].getAttribute('datetime'))).toLocaleString().slice(0, -3);
        } else {
            times[i].innerHTML = times[i].getAttribute('timeSince');
        }
        
    }
}