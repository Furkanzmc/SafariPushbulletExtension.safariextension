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
    var listItems = null;
    if (mPushType == "list") {
        listItems = message.split('*');
        listItems.splice(0, 1);
        console.log(listItems);
    }
    if (mIsDevice) {
        PushBullet.push(mPushType, mPushTarget, null, {
            title: title,
            url: link,
            body: message,
            items: listItems
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
            body: message,
            items: listItems
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
            removeLinkSharingFields();
            document.getElementById("link").setAttribute("hidden", "false");
            safari.self.height = 399;
        } else if (mPushType == "link") {
            fillLinkSharingFields();
            document.getElementById("link").removeAttribute("hidden");
            safari.self.height = 430;
        } else if (mPushType == "list") {
            removeLinkSharingFields();
            document.getElementById("link").setAttribute("hidden", "false");
            document.getElementById("message").setAttribute("placeholder", "Start every list item with * (asterisk)");
            safari.self.height = 399;
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

function addPushToList(pushObject) {
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
                {{url_part}} \
                {{list_items}}\
                {{background_style}}\
            </div> \
        </div> </div>\ ';

    var list = "";
    //If the incoming push is a list add the check boxes
    if (pushObject.items != null) {
        var listTemplate = '<label><input type="checkbox" value="checked" id="squaredThree" name="check" {{is_checked}}/>{{item_text}}</label>\ ';
        var items = pushObject.items.reverse();
        for (var i = items.length - 1; i >= 0; i--) {
            var a = listTemplate.replace('{{item_text}}', items[i].text);
            a = a.replace('{{is_checked}}', items[i].checked ? "checked" : "");
            list += a;
        }
    };
    var temp = templateHTML;
    // temp = temp.replace("{{profile_pic}}", profilePic);
    temp = temp.replace("{{list_items}}", list);
    temp = temp.replace("{{push_iden}}", pushObject.iden);
    temp = temp.replace("{{push_iden}}", pushObject.iden);
    temp = temp.replace("{{sender_name}}", pushObject.sender_name);
    temp = temp.replace("{{receiver_name}}", pushObject.receiver_name);
    if (pushObject.title == null && pushObject.file_name != null) {
        temp = temp.replace("{{push_title}}", pushObject.file_name);
    } else {
        temp = temp.replace("{{push_title}}", pushObject.title == null ? "" : pushObject.title);
    }

    temp = temp.replace("{{push_message}}", pushObject.body == null ? "" : pushObject.body);
    //Check to see if a file is present
    var urlPart = '<div class="text"><a href="{{push_url}}" target="_blank" onclick="openLink(this)">{{push_url_text}}</a></div>';

    //If no URL exists set the url an empty string so no url shows up
    var url = "";
    var urlText = "";
    if (pushObject.file_url != null) {
        url = pushObject.file_url;
        urlText = "Download Here";
    } else if (pushObject.url != null) {
        url = pushObject.url;
        urlText = pushObject.url;
    }
    urlPart = urlPart.replace("{{push_url}}", url);
    temp = temp.replace('{{url_part}}', urlPart.replace("{{push_url_text}}", urlText));

    //If the incoming push is a file add the necessary fields
    var style = '<div id="img_container"><img src="{{file_url}}"/></div>';
    if (pushObject.file_type != null && pushObject.file_type.search("image") >= 0) {
        temp = temp.replace("{{background_style}}", pushObject.file_url == null ? "" : style.replace('{{file_url}}', pushObject.file_url));
    } else {
        temp = temp.replace("{{background_style}}", "");
    }
    document.getElementById("push_list").innerHTML += temp;
}

function removePush(maybe) {
    var pushID = maybe.getAttribute("iden");
    //TODO: The server returns bad request error.
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
                    console.log(pushes[i]);
                    addPushToList(pushes[i]);
                }
            }
        }
    });
}

function openLink(element_) {
    safari.application.activeBrowserWindow.openTab().url = element_.getAttribute("href");
}