safari.application.addEventListener("popover", popoverHandler, true);
safari.application.addEventListener("change", settingChanged, true);
var mPushTarget = new String();
var mIsDevice = true;
var mPushType = "link";
var mAPIKey = "";

function settingChanged(event) {
    mAPIKey = event.newValue;
    console.log(mAPIKey);
}

function popoverHandler(event) {
    mAPIKey = safari.extension.settings.api_key
    PushBullet.APIKey = mAPIKey;
    console.log(mAPIKey);
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
                console.log(res);
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
                console.log(res);
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
    mPushType = element_.getAttribute("id") == "link_type" ? "link" : "note"
    console.log(mPushType);
    if (mPushType == "note") {
        document.getElementById("link").setAttribute("hidden", "false");
        safari.self.height = 399;
        removeLinkSharingFields();
    } else {
        document.getElementById("link").removeAttribute("hidden");
        safari.self.height = 430;
        fillLinkSharingFields();
    }
}