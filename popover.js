safari.application.addEventListener("popover", popoverHandler, true);
safari.application.addEventListener("change", settingChanged, true);
var mPushTarget = new String();
var mIsDevice = true;
var mPushType = "link";
var mAPIKey = "";

function settingChanged(event) {
    mAPIKey = event.newValue;
}

function popoverHandler(event) {
    mAPIKey = safari.extension.settings.api_key
    PushBullet.APIKey = mAPIKey;
    //Fill out the devices
    document.getElementById("combobox").innerHTML = "";
    document.getElementById("message").value = ""
    PushBullet.devices(function(err, res) {
        if (err) {
            throw err;
        } else {
            var index = 0;
            for (var i = res.devices.length - 1; i >= 0; i--) {
                if (res.devices[i].active == true) {
                    if (i == 0) {
                        mPushTarget = res.devices[i].iden;
                    };
                    document.getElementById("combobox").innerHTML += "<option iden=\"" + res.devices[i].iden + "\" value=\"" + index + "\">" + res.devices[i].nickname + "</option>";
                    index++;
                };
            };
        }
    });
    //Fill out the contacts
    PushBullet.contacts(function(err, res) {
        if (err) {
            throw err;
        } else {
            var index = 0;
            for (var i = res.contacts.length - 1; i >= 0; i--) {
                if (res.contacts[i].active == true) {
                    document.getElementById("combobox").innerHTML += "<option email=\"" + res.contacts[i].email + "\" value=\"" + index + "\">" + res.contacts[i].name +
                        " - " + res.contacts[i].email + "</option>";
                    index++;
                };
            };
        }
    });
    showPushArea();
    document.getElementById("link").removeAttribute("hidden");
    safari.self.height = 430;
    fillLinkSharingFields();
}

function fillLinkSharingFields() {
    document.getElementById("title").setAttribute("value", safari.application.activeBrowserWindow.activeTab.title);
    document.getElementById("link").setAttribute("value", safari.application.activeBrowserWindow.activeTab.url);
}

function removeLinkSharingFields() {
    document.getElementById("title").setAttribute("value", "");
    document.getElementById("link").setAttribute("value", "");
}

function pushIt() {
    var link = document.getElementById("link").getAttribute("hidden") == null ? document.getElementById("link").value : "";
    var title = document.getElementById("title").value;
    var message = document.getElementById("message").value;

    mAPIKey = safari.extension.settings.api_key
    PushBullet.APIKey = mAPIKey;
    if (mIsDevice) {
        PushBullet.push(mPushType, mPushTarget, null, {
            title: title,
            url: link,
            body: message
        }, function(err, res) {
            if (err) {
                throw err;
            } else {
                safari.extension.popovers[0].hide();
            }
        });
    } else {
        PushBullet.push(mPushType, null, mPushTarget, {
            title: title,
            url: link,
            body: message
        }, function(err, res) {
            if (err) {
                throw err;
            } else {
                safari.extension.popovers[0].hide();
            }
        });
    };

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
        };
    };
}

function changePushType(element_) {
    if (element_.getAttribute("id") == "show_pushes") {
        fillOutPushList();
        hidePushArea();
    } else {
        showPushArea();
        mPushType = element_.getAttribute("id") == "link_type" ? "link" : "note"
        if (mPushType == "note") {
            removeLinkSharingFields();
            document.getElementById("link").setAttribute("hidden", "false");
            safari.self.height = 399;
        }
        if (mPushType == "link") {
            fillLinkSharingFields();
            document.getElementById("link").removeAttribute("hidden");
            safari.self.height = 430;
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
    safari.self.height = 474;
}

function addPushToList(profilePic, senderName, receiverName, title, message, url, pushID) {
    // <img class="profile-pic" src="{{profile_pic}}"> \
    var templateHTML = '<div class="push" id="{{push_iden}}"><div class="inner-panel"> \
            <div class="top-line"> \
                <div class="small-text"> \
                    <b>{{sender_name}}</b> sent <b>{{receiver_name}}</b> a link \
                </div> \
                <i class="push-close pointer" iden="{{push_iden}}" onclick="removePush(this)"></i> \
                <i class="push-share pointer"></i> \
            </div> \
            <div class="panel"> \
                <div class="title">{{push_title}}</div> \
                <div class="text">{{push_message}}</div> \
                <div class="text"><a href="{{push_url}}" target="_blank" onclick="openLink(this)">{{push_url}}</a></div> \
            </div> \
        </div> </div>\ ';

    var temp = templateHTML;
    // temp = temp.replace("{{profile_pic}}", profilePic);
    temp = temp.replace("{{push_iden}}", pushID);
    temp = temp.replace("{{push_iden}}", pushID);
    temp = temp.replace("{{sender_name}}", senderName);
    temp = temp.replace("{{receiver_name}}", receiverName);
    temp = temp.replace("{{push_title}}", title == null ? "" : title);
    temp = temp.replace("{{push_message}}", message == null ? "" : message);
    temp = temp.replace("{{push_url}}", url == null ? "" : url);
    temp = temp.replace("{{push_url}}", url == null ? "" : url);
    document.getElementById("push_list").innerHTML += temp;
}

function removePush(maybe) {
    var pushID = maybe.getAttribute("iden");
    PushBullet.APIKey = mAPIKey;
    PushBullet.deletePush(pushID);
    document.getElementById("push_list").childNodes[pushID].remove();
}

function fillOutPushList() {
    PushBullet.APIKey = mAPIKey;
    PushBullet.pushHistory(function(err, res) {
        if (err) {
            throw err;
        } else {
            document.getElementById("push_list").innerHTML = "";
            var pushes = res.pushes.reverse();
            for (var i = pushes.length - 1; i >= 0; i--) {
                if (pushes[i].active) {
                    addPushToList(null, pushes[i].sender_name, pushes[i].receiver_email, pushes[i].title, pushes[i].body, pushes[i].url, pushes[i].iden);
                }
            }
        }
    });
}

function openLink(element_) {
    safari.application.activeBrowserWindow.openTab().url = element_.getAttribute("href");
}