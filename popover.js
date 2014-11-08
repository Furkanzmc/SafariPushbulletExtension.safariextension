safari.application.addEventListener("popover", popoverHandler, true);
safari.application.addEventListener("change", settingChanged, true);
window.addEventListener("load", init, false);


var mPushTarget = "";
var mIsDevice = true;
var mPushType = "link";
var mAPIKey = "";
var mLastPushTime = null;
var mUser = null;
var mContacts = null;
var mWebSocketConnected = false;
var mHasError = false;
var CHANGE_IN_SIZE = 1;

function showError(error, errorString) {
    if (mHasError == false) {
        document.getElementById("error_container").removeAttribute("hidden");
        if (error && error.message.length > 3) {
            document.getElementById("error_label").innerText = error.message;
            if (navigator.onLine == false) {
                document.getElementById("error_label").innerText += " - Check your connection";
            }
        }
        else if (navigator.onLine == false) {
            document.getElementById("error_label").innerText = "Check your connection";
        }
        if (errorString) {
            document.getElementById("error_label").innerText = errorString;
        }
        mHasError = true;
        safari.self.height += CHANGE_IN_SIZE;
    }
}

function hideErrorLabel() {
    if (mHasError) {
        document.getElementById("error_container").setAttribute("hidden", "true");
        safari.self.height -= CHANGE_IN_SIZE;
        mHasError = false;
    }
}

function settingChanged(event) {
    mAPIKey = event.newValue;
    setUpPushStream();
    testWebSocket();
}

function getUser() {
    mAPIKey = safari.extension.settings.api_key;
    PushBullet.APIKey = mAPIKey;
    mUser = PushBullet.user();
}

function fillOutPushTargets() {
    PushBullet.devices(function (err, res) {
        if (err) {
            showError(err);
        } else {
            for (var i = res.devices.length - 1; i >= 0; i--) {
                if (res.devices[i].active == true) {
                    if (i == 0) {
                        mPushTarget = res.devices[i].iden;
                    }
                    document.getElementById("combobox").innerHTML += "<option iden=\"" + res.devices[i].iden + "\" value=\"" + res.devices[i].iden + "\">" + res.devices[i].nickname + "</option>";
                }
            }
            getPushTarget(document.getElementById("combobox"));
            hideErrorLabel();
        }
    });
    //Fill out the contacts
    PushBullet.contacts(function (err, res) {
        if (err) {
            showError(err);
        } else {
            for (var i = res.contacts.length - 1; i >= 0; i--) {
                if (res.contacts[i].active == true) {
                    document.getElementById("combobox").innerHTML += "<option email=\"" + res.contacts[i].email + "\" value=\"" + res.contacts[i].iden + "\">" + res.contacts[i].name +
                        " - " + res.contacts[i].email + "</option>";
                }
            }
            getPushTarget(document.getElementById("combobox"));
            hideErrorLabel();
        }
    });
}

function popoverHandler(event) {
    if (mWebSocketConnected == false) {
        init();
        return;
    }
    if (mUser == null) {
        getUser();
    }
    if (mHasError) {
        safari.self.height = 430 + CHANGE_IN_SIZE;
    } else {
        safari.self.height = 430;
    }
    mPushType = "link";
    mAPIKey = safari.extension.settings.api_key;
    PushBullet.APIKey = mAPIKey;
    //Fill out the devices
    document.getElementById("combobox").innerHTML = "";
    document.getElementById("message").value = "";
    fillOutPushTargets();
    showPushArea();
    document.getElementById("link").removeAttribute("hidden");
    if (mHasError) {
        safari.self.height = 430 + CHANGE_IN_SIZE;
    } else {
        safari.self.height = 430;
    }
    fillLinkSharingFields();
}

function fillLinkSharingFields() {
    document.getElementById("title").setAttribute("value", safari.application.activeBrowserWindow.activeTab.title);
    document.getElementById("title").value = safari.application.activeBrowserWindow.activeTab.title;
    document.getElementById("link").setAttribute("value", safari.application.activeBrowserWindow.activeTab.url);
    document.getElementById("link").value = safari.application.activeBrowserWindow.activeTab.url;
}

function hideLinkSharingFields() {
    document.getElementById("title").setAttribute("value", "");
    document.getElementById("title").value = "";
    document.getElementById("link").setAttribute("value", "");
    document.getElementById("link").value = "";
}

function pushIt() {
    if (mWebSocketConnected == false) {
        return;
    }
    var link = document.getElementById("link").getAttribute("hidden") == null ? document.getElementById("link").value : "";
    var title = document.getElementById("title").value;
    var message = document.getElementById("message").value;

    document.getElementById("link").setAttribute('value', "");
    document.getElementById("title").setAttribute('value', "");
    document.getElementById("message").setAttribute('value', "");

    if ((link == "" || link == null) && mPushType != "list") {
        mPushType = "note";
    }

    mAPIKey = safari.extension.settings.api_key;
    PushBullet.APIKey = mAPIKey;
    var listItems = null;
    if (mPushType == "list") {
        listItems = message.split('*');
        listItems.splice(0, 1);
    }
    if (mIsDevice) {
        PushBullet.push(mPushType, mPushTarget, null, {
            title : title,
            url   : link,
            body  : message,
            items : listItems
        }, function (err, res) {
            if (err) {
                showError(err);
            } else {
                safari.extension.popovers[0].hide();
            }
        });
    } else {
        PushBullet.push(mPushType, null, mPushTarget, {
            title : title,
            url   : link,
            body  : message,
            items : listItems
        }, function (err, res) {
            if (err) {
                showError(err);
            } else {
                safari.extension.popovers[0].hide();
                hideErrorLabel();
            }
        });
    }

}

function getPushTarget(child) {
    var value = child.value;
    //Determine if we're dealing with a contact or device
    for (var i = child.children.length - 1; i >= 0; i--) {
        if (child.children[i].getAttribute("value") == value && child.children[i].getAttribute("email") != null) {
            mPushTarget = child.children[i].getAttribute("email");
            mIsDevice = false;
        } else if (child.children[i].getAttribute("value") == value && child.children[i].getAttribute("iden") != null) {
            mPushTarget = child.children[i].getAttribute("iden");
            mIsDevice = true;
        }
    }
}

function changePushType(element_) {
    if (element_.getAttribute("id") == "show_pushes") {
        fillOutPushList();
        hidePushArea();
    } else {
        showPushArea();
        switch (element_.getAttribute("id")) {
            case "link_type":
                mPushType = "link";
                break;
            case "note_type":
                mPushType = "note";
                break;
            case "list_type":
                mPushType = "list";
                break;
        }
        document.getElementById("message").setAttribute("placeholder", "Message");
        if (mPushType == "note") {
            document.getElementById("link").setAttribute("hidden", "false");
            if (mHasError) {
                safari.self.height = 399 + CHANGE_IN_SIZE;
            } else {
                safari.self.height = 399;
            }
            hideLinkSharingFields();
        } else if (mPushType == "link") {
            document.getElementById("link").removeAttribute("hidden");
            if (mHasError) {
                safari.self.height = 430 + CHANGE_IN_SIZE;
            } else {
                safari.self.height = 430;
            }
            fillLinkSharingFields();
        } else if (mPushType == "list") {
            document.getElementById("link").setAttribute("hidden", "false");
            document.getElementById("message").setAttribute("placeholder", "Start every list item with * (asterisk)");
            if (mHasError) {
                safari.self.height = 399 + CHANGE_IN_SIZE;
            } else {
                safari.self.height = 399;
            }
            hideLinkSharingFields();
        }
    }
}

function showPushArea() {
    document.getElementById("pushArea").removeAttribute("hidden");
    document.getElementById("push_list").setAttribute("hidden", "true");
}

function hidePushArea() {
    document.getElementById("pushArea").setAttribute("hidden", "true");
    document.getElementById("push_list").removeAttribute("hidden");
    if (mHasError) {
        safari.self.height = 474 + CHANGE_IN_SIZE;
    } else {
        safari.self.height = 474;
    }
}

function removePush(maybe) {
    var pushID = maybe.getAttribute("iden");
    //TODO: The server returns bad request error.
    PushBullet.APIKey = mAPIKey;
    PushBullet.deletePush(pushID);
    document.getElementById("push_list").childNodes[pushID].remove();
}

function getContactName(contactEmail, senderEmail) {
    senderEmail = senderEmail || null;
    if (contactEmail == mUser.email) {
        if (senderEmail != mUser.email) {
            return "you";
        }
        return "yourself";
    }
    if (mContacts == null) {
        getContacts();
    }
    for (var i = 0; i < mContacts.length; i++) {
        if (mContacts[i].active == false) {
            continue;
        }
        if (mContacts[i].email == contactEmail) {
            return mContacts[i].name;
        }
    }
}

function capitaliseFirstLetter(string) {
    console.log("Capitalise - " + string);
    if (string == null || string.length == 0) {
        return 0;
    }
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function addPushToList(pushObject) {
    // <img class="profile-pic" src="{{profile_pic}}"> \
    var templateHTML = '<div class="push" id="{{push_iden}}"><div class="inner-panel"> \
            <div class="top-line"> \
                <div class="small-text"> \
                    <b>{{sender_name}}</b> sent <b>{{receiver_name}}</b> a {{push_type}} \
                </div> \
                <i class="push-close pointer" iden="{{push_iden}}" onclick="removePush(this)"></i> \
            </div> \
            <div class="panel"> \
                <div class="title">{{push_title}}</div> \
                <div class="text">{{push_message}}</div> \
                {{url_part}} \
                <div id="items_div" onclick="updatePushItems(this)">{{list_items}}</div>\
                {{background_style}}\
            </div> \
        </div> </div>\ ';

    var list = "";
    //If the incoming push is a list add the check boxes
    if (pushObject.type == "list") {
        var listTemplate = '<label><input pushID="{{push_iden}}" type="checkbox" id="squaredThree" {{is_checked}}/>{{item_text}}</label>\ ';
        var items = pushObject.items.reverse();
        for (var i = items.length - 1; i >= 0; i--) {
            var a = listTemplate.replace('{{item_text}}', items[i].text);
            a = listTemplate.replace('{{item_text}}', items[i].text);
            a = a.replace('{{is_checked}}', items[i].checked ? "checked" : "");
            a = a.replace("{{push_iden}}", pushObject.iden);
            list += a;
        }
    }
    var temp = templateHTML;
    // temp = temp.replace("{{profile_pic}}", profilePic);
    temp = temp.replace("{{list_items}}", list);
    temp = temp.replace("{{push_type}}", pushObject.type);
    temp = temp.replace("{{push_iden}}", pushObject.iden);
    temp = temp.replace("{{push_iden}}", pushObject.iden);
    temp = temp.replace("{{sender_name}}", pushObject.sender_name == mUser.name ? "You" : pushObject.sender_name);
    temp = temp.replace("{{receiver_name}}", getContactName(pushObject.receiver_email, pushObject.sender_email));
    if (pushObject.title == null && pushObject.file_name != null) {
        temp = temp.replace("{{push_title}}", pushObject.file_name);
    } else {
        var title = pushObject.title;
        if (title == null || title == "") {
            title = capitaliseFirstLetter(pushObject.type);
        }
        temp = temp.replace("{{push_title}}", title);
    }
    var pushBody = pushObject.body;
    if (pushBody == null) {
        pushBody = "";
    }
    temp = temp.replace("{{push_message}}", pushBody);
    //Check to see if a file is present
    var urlPart = '<div class="text"><a href="{{push_url}}" target="_blank" onclick="openLink(this)">{{push_url_text}}</a></div>';

    //If no URL exists set the url an empty string so no url shows up
    var url = "";
    var urlText = "";
    if (pushObject.type == "link") {
        url = pushObject.url;
        urlText = pushObject.url;
    }

    //If the incoming push is a file add the necessary fields
    if (pushObject.type == "file") {
        urlText = "Download Here";
        url = pushObject.file_url;
        var style = '<div id="img_container"><img src="{{file_url}}"/></div>';
        if (pushObject.file_type != null && pushObject.file_type.search("image") >= 0) {
            temp = temp.replace("{{background_style}}", pushObject.file_url == null ? "" : style.replace('{{file_url}}', pushObject.file_url));
        } else {
            temp = temp.replace("{{background_style}}", "");
        }
    } else {
        temp = temp.replace("{{background_style}}", "");
    }

    urlPart = urlPart.replace("{{push_url}}", url);
    temp = temp.replace('{{url_part}}', urlPart.replace("{{push_url_text}}", urlText));
    document.getElementById("push_list").innerHTML += temp;
}

function updatePushItems(element) {
    console.log(element);
    var pushId = element.getElementsByTagName("label")[0].getElementsByTagName("input")[0].getAttribute("pushID");
    var newItems = [];
    var labels = element.getElementsByTagName("label");
    for (var i = 0; i < labels.length; i++) {
        var item = {"checked" : labels[i].getElementsByTagName("input")[0].checked, "text" : labels[i].innerText};
        newItems[newItems.length] = item;
    }
    PushBullet.updatePush(pushId, newItems, true, function (err2, res2) {
        console.log(res2);
    });
    console.log(newItems);
}

function fillOutPushList() {
    PushBullet.APIKey = mAPIKey;
    PushBullet.pushHistory(function (err, res) {
        if (err) {
            showError(err);
        } else {
            document.getElementById("push_list").innerHTML = "";
            var pushes = res.pushes.reverse();
            for (var i = pushes.length - 1; i >= 0; i--) {
                if (pushes[i].active) {
                    addPushToList(pushes[i]);
                }
            }
            hideErrorLabel();
        }
    });
}

function openLink(element_) {
    safari.application.activeBrowserWindow.openTab().url = element_.getAttribute("href");
}

function notify(title, body, tag) {
    // check for notification compatibility
    if (!window.Notification) {
        // if browser version is unsupported, be silent
        return;
    }
    // log current permission level
    // console.log(Notification.permission);
    // if the user has not been asked to grant or deny notifications from this domain
    if (Notification.permission == 'default') {
        Notification.requestPermission(function () {
            // callback this function once a permission level has been set
            notify();
        });
    }
    // if the user has granted permission for this domain to send notifications
    else if (Notification.permission == 'granted') {
        var n = new Notification(
            title, {
                'body' : body,
                // prevent duplicate notifications
                'tag'  : tag
            }
        );
        // remove the notification from Notification Center when it is clicked
        n.onclick = function () {
            PushBullet.APIKey = mAPIKey;
            PushBullet.pushHistory(function (err, res) {
                if (err) {
                    showError(err);
                } else {
                    var pushes = res.pushes.reverse();
                    for (var i = pushes.length - 1; i >= 0; i--) {
                        if (pushes[i].iden == n.tag && pushes[i].type == "link") {
                            safari.application.activeBrowserWindow.openTab().url = pushes[i].url;
                            this.close();
                            break;
                        }
                    }
                    this.close();
                }
            });
        };
        // callback function when the notification is closed
        n.onclose = function () {
            console.log('Notification closed');
        };
    }
    // if the user does not want notifications to come from this domain
    else if (Notification.permission == 'denied') {
        // be silent
        return;
    }
}

function getLatestPush() {
    mAPIKey = safari.extension.settings.api_key;
    PushBullet.APIKey = mAPIKey;
    PushBullet.pushHistory(mLastPushTime, function (err, res) {
        if (err) {
            showError(err);
        } else {
            var pushes = res.pushes.reverse();
            for (var i = pushes.length - 1; i >= 0; i--) {
                if (pushes[i].active) {
                    if (pushes[i].sender_email == mUser.email) {
                        continue;
                    }
                    var notification = "";
                    if (pushes[i].body == null) {
                        notification = pushes[i].url;
                    } else if (pushes[i].url == null) {
                        notification = pushes[i].body;
                    } else if (pushes[i].body != null && pushes[i].url != null) {
                        notification = pushes[i].body + "\n" + pushes[i].url;
                    }
                    var title = pushes[i].title;
                    if (title == null || title == "") {
                        title = capitaliseFirstLetter(pushObject.type);
                    }
                    notify(title, notification, pushes[i].iden);
                }
                hideErrorLabel();
            }
            mLastPushTime = pushes[pushes.length - 1].modified;
        }
    });
}


var wsUriTemplate = "wss://stream.pushbullet.com/websocket/";
var wsUri = null;

function getContacts() {
    PushBullet.APIKey = mAPIKey;
    PushBullet.contacts(function (error, res) {
        if (error) {
            showError(error);
        } else {
            mContacts = res.contacts;
            hideErrorLabel();
        }
    });
}

function init() {
    if (mWebSocketConnected == false) {
        setUpPushStream();
        testWebSocket();
        getUser();
        fillOutPushTargets();
        mWebSocketConnected = true;
    }
}

function setUpPushStream() {
    mAPIKey = safari.extension.settings.api_key;
    PushBullet.APIKey = mAPIKey;
    getContacts();
    PushBullet.pushHistory(function (err, res) {
        if (err) {
            showError(err);
        } else {
            var pushes = res.pushes.reverse();
            mLastPushTime = pushes[pushes.length - 1].modified;
            hideErrorLabel();
        }
    });
    wsUri = wsUriTemplate + mAPIKey;
}

function testWebSocket() {
    websocket = new WebSocket(wsUri);
    websocket.onopen = function (evt) {
        onOpen(evt);
    };
    websocket.onclose = function (evt) {
        onClose(evt);
    };
    websocket.onmessage = function (evt) {
        onMessage(evt);
    };
    websocket.onerror = function (evt) {
        onError(evt);
    };
}

function onOpen(evt) {
    console.log("CONNECTED");
    doSend("WebSocket rocks");
}

function onClose(evt) {
    console.log("DISCONNECTED - " + evt.data);
    mWebSocketConnected = false;
}

function onMessage(evt) {
    //This is where we handle the push
    var message = JSON.parse(evt.data);
    console.log(message);
    if (message.type == "tickle" && message.subtype == "push") {
        getLatestPush();
    }
}

function onError(evt) {
    console.log(evt.data);
    mWebSocketConnected = false;
    showError(null, evt.data);
}

function doSend(message) {
    websocket.send(message);
}