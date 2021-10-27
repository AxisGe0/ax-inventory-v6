var InventoryOption = "120, 10, 20";

var totalWeight = 0;
var totalWeightOther = 0;

var playerMaxWeight = 0;
var otherMaxWeight = 0;

var otherLabel = "";

var ClickedItemData = {};

var SelectedAttachment = null;
var AttachmentScreenActive = false;
var ControlPressed = false;
var disableRightMouse = false;
var selectedItem = null;

var IsDragging = false;


$(document).on("keydown", function() {
    if (event.repeat) {
        return;
    }
    switch (event.keyCode) {
        case 27: // ESC
            Inventory.Close();
            break;
        case 9: // TAB
            Inventory.Close();
            break;
        case 17: // TAB
            ControlPressed = true;
            break;
    }
});

$(document).on("keyup", function() {
    switch (event.keyCode) {
        case 17: // TAB
            ControlPressed = false;
            break;
    }
});

$(document).on("dblclick", ".item-slot", function(e){
    var ItemData = $(this).data("item");
    var ItemInventory = $(this).parent().attr("data-inventory");
    if(ItemData) {
        Inventory.Close();
        $.post("https://ax-inventory/UseItem", JSON.stringify({
            inventory: ItemInventory,
            item: ItemData,
        }));
    }
});

$(document).on("mouseenter", ".item-slot", function(e){
    e.preventDefault();
    if ($(this).data("item") != null) {
        $(".ply-iteminfo-container").fadeIn(150);
        FormatItemInfo($(this).data("item"));
    } else {
        $(".ply-iteminfo-container").fadeOut(100);
    }
});


// Autostack Quickmove
function GetFirstFreeSlot($toInv, $fromSlot) {
    var retval = null;
    $.each($toInv.find('.item-slot'), function(i, slot){
        if ($(slot).data('item') === undefined) {
            if (retval === null) {
                retval = (i + 1);
            }
        }
    });
    return retval;
}

function CanQuickMove() {
    var otherinventory = otherLabel.toLowerCase();
    var retval = true;
    // if (otherinventory == "Ground") {
    //     retval = false
    // } else if (otherinventory.split("-")[0] == "dropped") {
    //     retval = false;
    // }
    if (otherinventory.split("-")[0] == "player") {
        retval = false;
    }
    return retval;
}

$(document).on('mousedown', '.item-slot', function(event){
    switch(event.which) {
        case 3:
            fromSlot = $(this).attr("data-slot");
            fromInventory = $(this).parent();

            if ($(fromInventory).attr('data-inventory') == "player") {
                toInventory = $(".other-inventory");
            } else {
                toInventory = $(".player-inventory");
            }
            toSlot = GetFirstFreeSlot(toInventory, $(this));
            if ($(this).data('item') === undefined) {
                return;
            }
            toAmount = $(this).data('item').amount;
            if (ControlPressed) {
                if (toAmount > 1) {
                    toAmount = Math.round(toAmount / 2)
                }
            }
            if (CanQuickMove()) {
                if (toSlot === null) {
                    InventoryError(fromInventory, fromSlot);
                    return;
                }
                if (fromSlot == toSlot && fromInventory == toInventory) {
                    return;
                }
                if (toAmount >= 0) {
                    if (updateweights(fromSlot, toSlot, fromInventory, toInventory, toAmount)) {
                        swap(fromSlot, toSlot, fromInventory, toInventory, toAmount);
                    }
                }
            } else {
                InventoryError(fromInventory, fromSlot);
            }
            break;
    }
});
$(document).on('click', '.weapon-attachments-back', function(e){
    e.preventDefault();
    $("#ax-inventory").css({"display":"block"});
    $("#ax-inventory").animate({
        left: 0+"vw"
    }, 200);
    $(".weapon-attachments-container").animate({
        left: -100+"vw"
    }, 200, function(){
        $(".weapon-attachments-container").css({"display":"none"});
    });
    AttachmentScreenActive = false;
});

function FormatAttachmentInfo(data) {
    $.post("https://ax-inventory/GetWeaponData", JSON.stringify({
        weapon: data.name,
        ItemData: ClickedItemData
    }), function(data){
        var AmmoLabel = "9mm";
        var Durability = 100;
        if (data.WeaponData.ammotype == "AMMO_RIFLE") {
            AmmoLabel = "7.62"
        } else if (data.WeaponData.ammotype == "AMMO_SHOTGUN") {
            AmmoLabel = "12 Gauge"
        }
        if (ClickedItemData.info.quality !== undefined) {
            Durability = ClickedItemData.info.quality;
        }

        $(".weapon-attachments-container-title").html(data.WeaponData.label + " | " + AmmoLabel);
        $(".weapon-attachments-container-description").html(data.WeaponData.description);
        $(".weapon-attachments-container-details").html('<span style="font-weight: bold; letter-spacing: .1vh;">Serial Number</span><br> ' + ClickedItemData.info.serie + '<br><br><span style="font-weight: bold; letter-spacing: .1vh;">Durability - ' + Durability.toFixed() + '% </span> <div class="weapon-attachments-container-detail-durability"><div class="weapon-attachments-container-detail-durability-total"></div></div>')
        $(".weapon-attachments-container-detail-durability-total").css({
            width: Durability + "%"
        });
        $(".weapon-attachments-container-image").attr('src', './attachment_images/' + data.WeaponData.name + '.png');
        $(".weapon-attachments").html("");

        if (data.AttachmentData !== null && data.AttachmentData !== undefined) {
            if (data.AttachmentData.length > 0) {
                $(".weapon-attachments-title").html('<span style="font-weight: bold; letter-spacing: .1vh;">Attachments</span>');
                $.each(data.AttachmentData, function(i, attachment){
                    var WeaponType = (data.WeaponData.ammotype).split("_")[1].toLowerCase();
                    $(".weapon-attachments").append('<div class="weapon-attachment" id="weapon-attachment-'+i+'"> <div class="weapon-attachment-label"><p>' + attachment.label + '</p></div> <div class="weapon-attachment-img"><img src="./images/' + WeaponType + '_' + attachment.attachment + '.png"></div> </div>')
                    attachment.id = i;
                    $("#weapon-attachment-"+i).data('AttachmentData', attachment)
                });
            } else {
                $(".weapon-attachments-title").html('<span style="font-weight: bold; letter-spacing: .1vh;">This gun doesn\'t contain attachments</span>');
            }
        } else {
            $(".weapon-attachments-title").html('<span style="font-weight: bold; letter-spacing: .1vh;">This gun doesn\'t contain attachments</span>');
        }

        handleAttachmentDrag()
    });
}

var AttachmentDraggingData = {};

function handleAttachmentDrag() {
    $(".weapon-attachment").draggable({
        helper: 'clone',
        appendTo: "body",
        scroll: true,
        revertDuration: 0,
        revert: "invalid",
        start: function(event, ui) {
           var ItemData = $(this).data('AttachmentData');
           $(this).addClass('weapon-dragging-class');
           AttachmentDraggingData = ItemData
        },
        stop: function() {
            $(this).removeClass('weapon-dragging-class');
        },
    });
    $(".weapon-attachments-remove").droppable({
        accept: ".weapon-attachment",
        hoverClass: 'weapon-attachments-remove-hover',
        drop: function(event, ui) {
            $.post('https://ax-inventory/RemoveAttachment', JSON.stringify({
                AttachmentData: AttachmentDraggingData,
                WeaponData: ClickedItemData,
            }), function(data){
                if (data.Attachments !== null && data.Attachments !== undefined) {
                    if (data.Attachments.length > 0) {
                        $("#weapon-attachment-" + AttachmentDraggingData.id).fadeOut(150, function(){
                            $("#weapon-attachment-" + AttachmentDraggingData.id).remove();
                            AttachmentDraggingData = null;
                        });
                    } else {
                        $("#weapon-attachment-" + AttachmentDraggingData.id).fadeOut(150, function(){
                            $("#weapon-attachment-" + AttachmentDraggingData.id).remove();
                            AttachmentDraggingData = null;
                            $(".weapon-attachments").html("");
                        });
                        $(".weapon-attachments-title").html('<span style="font-weight: bold; letter-spacing: .1vh;">This gun doesn\'t contain attachments</span>');
                    }
                } else {
                    $("#weapon-attachment-" + AttachmentDraggingData.id).fadeOut(150, function(){
                        $("#weapon-attachment-" + AttachmentDraggingData.id).remove();
                        AttachmentDraggingData = null;
                        $(".weapon-attachments").html("");
                    });
                    $(".weapon-attachments-title").html('<span style="font-weight: bold; letter-spacing: .1vh;">This gun doesn\'t contain attachments</span>');
                }
            });
        },
    });
}

$(document).on('click', '#weapon-attachments', function(e){
    e.preventDefault();
    if (!Inventory.IsWeaponBlocked(ClickedItemData.name)) {
        $(".weapon-attachments-container").css({"display":"block"})
        $("#ax-inventory").animate({
            left: 100+"vw"
        }, 200, function(){
            $("#ax-inventory").css({"display":"none"})
        });
        $(".weapon-attachments-container").animate({
            left: 0+"vw"
        }, 200);
        AttachmentScreenActive = true;
        FormatAttachmentInfo(ClickedItemData);    
    } else {
        $.post('https://ax-inventory/Notify', JSON.stringify({
            message: "Attachments are unavailable for this gun.",
            type: "error"
        }))
    }
});

function FormatItemInfo(itemData) {
    if (itemData != null && itemData.info != "") {
        if (itemData.name == "id_card") {
            var gender = "Man";
            if (itemData.info.gender == 1) {
                gender = "Woman";
            }
            $(".item-info-title").html('<p>'+itemData.label+'</p>')
            $(".item-info-description").html('<p><strong>CSN: </strong><span>' + itemData.info.citizenid + '</span></p><p><strong>First Name: </strong><span>' + itemData.info.firstname + '</span></p><p><strong>Last Name: </strong><span>' + itemData.info.lastname + '</span></p><p><strong>Birth Date: </strong><span>' + itemData.info.birthdate + '</span></p><p><strong>Gender: </strong><span>' + gender + '</span></p><p><strong>Nationality: </strong><span>' + itemData.info.nationality + '</span></p>');
        } else if (itemData.name == "driver_license") {
            $(".item-info-title").html('<p>'+itemData.label+'</p>')
            $(".item-info-description").html('<p><strong>First Name: </strong><span>' + itemData.info.firstname + '</span></p><p><strong>Last Name: </strong><span>' + itemData.info.lastname + '</span></p><p><strong>Birth Date: </strong><span>' + itemData.info.birthdate + '</span></p><p><strong>Licenses: </strong><span>' + itemData.info.type + '</span></p>');
        } else if (itemData.name == "lawyerpass") {
            $(".item-info-title").html('<p>'+itemData.label+'</p>')
            $(".item-info-description").html('<p><strong>Pass-ID: </strong><span>' + itemData.info.id + '</span></p><p><strong>First Name: </strong><span>' + itemData.info.firstname + '</span></p><p><strong>Last Name: </strong><span>' + itemData.info.lastname + '</span></p><p><strong>CSN: </strong><span>' + itemData.info.citizenid + '</span></p>');
        } else if (itemData.name == "harness") {
            $(".item-info-title").html('<p>'+itemData.label+'</p>')
            $(".item-info-description").html('<p>'+itemData.info.uses+' uses left.</p>');
        } else if (itemData.type == "weapon") {
            $(".item-info-title").html('<p>'+itemData.label+'</p>')
            if (itemData.info.ammo == undefined) {
                itemData.info.ammo = 0;
            } else {
                itemData.info.ammo != null ? itemData.info.ammo : 0;
            }
            if (itemData.info.attachments != null) {
                var attachmentString = "";
                $.each(itemData.info.attachments, function (i, attachment) {
                    if (i == (itemData.info.attachments.length - 1)) {
                        attachmentString += attachment.label
                    } else {
                        attachmentString += attachment.label + ", "
                    }
                });
                $(".item-info-description").html('<p><strong>Serial Number: </strong><span>' + itemData.info.serie + '</span></p><p><strong>Munition: </strong><span>' + itemData.info.ammo + '</span></p><p><strong>Attachments: </strong><span>' + attachmentString + '</span></p>');
            } else{
                $(".item-info-description").html('<p><strong>Serial Number: </strong><span>' + itemData.info.serie + '</span></p><p><strong>Munition: </strong><span>' + itemData.info.ammo + '</span></p><p>' + itemData.description + '</p>');
            }
        } else if (itemData.name == "filled_evidence_bag") {
            $(".item-info-title").html('<p>'+itemData.label+'</p>')
            if (itemData.info.type == "casing") {
                $(".item-info-description").html('<p><strong>Evidence material: </strong><span>' + itemData.info.label + '</span></p><p><strong>Type number: </strong><span>' + itemData.info.ammotype + '</span></p><p><strong>Caliber: </strong><span>' + itemData.info.ammolabel + '</span></p><p><strong>Serial Number: </strong><span>' + itemData.info.serie + '</span></p><p><strong>Crime scene: </strong><span>' + itemData.info.street + '</span></p><br /><p>' + itemData.description + '</p>');
            }else if (itemData.info.type == "blood") {
                $(".item-info-description").html('<p><strong>Evidence material: </strong><span>' + itemData.info.label + '</span></p><p><strong>Blood type: </strong><span>' + itemData.info.bloodtype + '</span></p><p><strong>DNA Code: </strong><span>' + itemData.info.dnalabel + '</span></p><p><strong>Crime scene: </strong><span>' + itemData.info.street + '</span></p><br /><p>' + itemData.description + '</p>');
            }else if (itemData.info.type == "fingerprint") {
                $(".item-info-description").html('<p><strong>Evidence material: </strong><span>' + itemData.info.label + '</span></p><p><strong>Vingerpatroon: </strong><span>' + itemData.info.fingerprint + '</span></p><p><strong>Plaats delict: </strong><span>' + itemData.info.street + '</span></p><br /><p>' + itemData.description + '</p>');
            }else if (itemData.info.type == "dna") {
                $(".item-info-description").html('<p><strong>Evidence material: </strong><span>' + itemData.info.label + '</span></p><p><strong>DNA Code: </strong><span>' + itemData.info.dnalabel + '</span></p><br /><p>' + itemData.description + '</p>');
            }
        } else if (itemData.info.costs != undefined && itemData.info.costs != null) {
            $(".item-info-title").html('<p>'+itemData.label+'</p>')
            $(".item-info-description").html('<p>'+ itemData.info.costs + '</p>');
        } else if (itemData.name == "stickynote") {
            $(".item-info-title").html('<p>'+itemData.label+'</p>')
            $(".item-info-description").html('<p>'+ itemData.info.label + '</p>');
        } else if (itemData.name == "moneybag") {
            $(".item-info-title").html('<p>'+itemData.label+'</p>')
            $(".item-info-description").html('<p><strong>Amount of cash: </strong><span>$' + itemData.info.cash + '</span></p>');
        } else if (itemData.name == "markedbills") {
            $(".item-info-title").html('<p>'+itemData.label+'</p>')
            $(".item-info-description").html('<p><strong>Worth: </strong><span>$' + itemData.info.worth + '</span></p>');
        } else if (itemData.name == "labkey") {
            $(".item-info-title").html('<p>'+itemData.label+'</p>')
            $(".item-info-description").html('<p>Lab: ' + itemData.info.lab + '</p>');
        } else {
            $(".item-info-title").html('<p>'+itemData.label+'</p>')
            $(".item-info-description").html('<p>' + itemData.description + '</p>')
        }
    } else {
        $(".item-info-title").html('<p>'+itemData.label+'</p>')
        $(".item-info-description").html('<p>' + itemData.description + '</p>')
    }
 }

function handleDragDrop() {
    $(".item-drag").draggable({
        helper: 'clone',
        appendTo: "body",
        scroll: true,
        revertDuration: 0,
        revert: "invalid",
        cancel: ".item-nodrag",
        start: function(event, ui) {
            IsDragging = true;
           // $(this).css("background", "rgba(20,20,20,1.0)");
            $(this).find("img").css("filter", "brightness(50%)");

            $(".item-slot").css("border", "1px solid rgba(255, 255, 255, 0.1)")

            var itemData = $(this).data("item");
            var dragAmount = $("#item-amount").val();
            

            if ( dragAmount == 0) {
                if (itemData.price != null) {
                    $(this).find(".item-slot-amount p").html('0 (0.0)');
                    $(".ui-draggable-dragging").find(".item-slot-amount p").html('('+itemData.amount+') $' + itemData.price);
                    $(".ui-draggable-dragging").find(".item-slot-key").remove();
                    if ($(this).parent().attr("data-inventory") == "hotbar") {
                        // $(".ui-draggable-dragging").find(".item-slot-key").remove();
                    }
                } else {
                    $(this).find(".item-slot-amount p").html('0 (0.0)');
                    $(".ui-draggable-dragging").find(".item-slot-amount p").html(itemData.amount + ' (' + ((itemData.weight * itemData.amount) / 1000).toFixed(1) + ')');
                    $(".ui-draggable-dragging").find(".item-slot-key").remove();
                    if ($(this).parent().attr("data-inventory") == "hotbar") {
                        // $(".ui-draggable-dragging").find(".item-slot-key").remove();
                    }
                }
            } else if(dragAmount > itemData.amount) {
                if (itemData.price != null) {
                    $(this).find(".item-slot-amount p").html('('+itemData.amount+') $' + itemData.price);
                    if ($(this).parent().attr("data-inventory") == "hotbar") {
                        // $(".ui-draggable-dragging").find(".item-slot-key").remove();
                    }
                } else {
                    $(this).find(".item-slot-amount p").html(itemData.amount + ' (' + ((itemData.weight * itemData.amount) / 1000).toFixed(1) + ')');
                    if ($(this).parent().attr("data-inventory") == "hotbar") {
                        // $(".ui-draggable-dragging").find(".item-slot-key").remove();
                    }
                }
                InventoryError($(this).parent(), $(this).attr("data-slot"));
            } else if(dragAmount > 0) {
                if (itemData.price != null) {
                    $(this).find(".item-slot-amount p").html('('+itemData.amount+') $' + itemData.price);
                    $(".ui-draggable-dragging").find(".item-slot-amount p").html('('+itemData.amount+') $' + itemData.price);
                    $(".ui-draggable-dragging").find(".item-slot-key").remove();
                    if ($(this).parent().attr("data-inventory") == "hotbar") {
                        // $(".ui-draggable-dragging").find(".item-slot-key").remove();
                    }
                } else {
                    $(this).find(".item-slot-amount p").html((itemData.amount - dragAmount) + ' (' + ((itemData.weight * (itemData.amount - dragAmount)) / 1000).toFixed(1) + ')');
                    $(".ui-draggable-dragging").find(".item-slot-amount p").html(dragAmount + ' (' + ((itemData.weight * dragAmount) / 1000).toFixed(1) + ')');
                    $(".ui-draggable-dragging").find(".item-slot-key").remove();
                    if ($(this).parent().attr("data-inventory") == "hotbar") {
                        // $(".ui-draggable-dragging").find(".item-slot-key").remove();
                    }
                }
            } else {
                if ($(this).parent().attr("data-inventory") == "hotbar") {
                    // $(".ui-draggable-dragging").find(".item-slot-key").remove();
                }
                $(".ui-draggable-dragging").find(".item-slot-key").remove();
                $(this).find(".item-slot-amount p").html(itemData.amount + ' (' + ((itemData.weight * itemData.amount) / 1000).toFixed(1) + ')');
                InventoryError($(this).parent(), $(this).attr("data-slot"));
            }
        },
        stop: function() {
            setTimeout(function(){
                IsDragging = false;
            }, 300)
            //$(this).css("background", "rgba(235, 235, 235, 0.03)");
            $(this).find("img").css("filter", "brightness(100%)");
            //$("#item-use").css("background", "transparent");
        },
    });

    $(".item-slot").droppable({
        hoverClass: 'item-slot-hoverClass',
        drop: function(event, ui) {
            setTimeout(function(){
                IsDragging = false;
            }, 300)
            fromSlot = ui.draggable.attr("data-slot");
            fromInventory = ui.draggable.parent();
            toSlot = $(this).attr("data-slot");
            toInventory = $(this).parent();
            toAmount = $("#item-amount").val();

            if (fromSlot == toSlot && fromInventory == toInventory) {
                return;
            }
            if (toAmount >= 0) {
                if (updateweights(fromSlot, toSlot, fromInventory, toInventory, toAmount)) {
                    swap(fromSlot, toSlot, fromInventory, toInventory, toAmount);
                }
            }
        },
    });

    $("#item-use").droppable({
        hoverClass: 'button-hover',
        drop: function(event, ui) {
            setTimeout(function(){
                IsDragging = false;
            }, 300)
            fromData = ui.draggable.data("item");
            fromInventory = ui.draggable.parent().attr("data-inventory");
            if(fromData.useable) {
                if (fromData.shouldClose) {
                    Inventory.Close();
                }
                $.post("https://ax-inventory/UseItem", JSON.stringify({
                    inventory: fromInventory,
                    item: fromData,
                }));
            }
        }
    });
    /*$("#item-give").droppable({
        hoverClass: 'button-hover',
        drop: function(event, ui) {
            setTimeout(function(){
                IsDragging = false;
            }, 300)
            fromData = ui.draggable.data("item");
            fromInventory = ui.draggable.parent().attr("data-inventory");
            amount = $("#item-amount").val();
            if(fromData.amount > 0) {
                $.post("https://ax-inventory/GiveItem", JSON.stringify({
                    inventory: fromInventory,
                    item: fromData,
                    amount: parseInt(amount),
                }));
                Inventory.Close();
            }
        }
    });*/
    $("#item-give").click(function() {
        Inventory.Close()
    })
    $("#item-drop").droppable({
        hoverClass: 'item-slot-hoverClass',
        drop: function(event, ui) {
            setTimeout(function(){
                IsDragging = false;
            }, 300)
            fromData = ui.draggable.data("item");
            fromInventory = ui.draggable.parent().attr("data-inventory");
            amount = $("#item-amount").val();
            if (amount == 0) {amount=fromData.amount}
            $(this).css("background", "rgba(35,35,35, 0.7");
            $.post("https://ax-inventory/DropItem", JSON.stringify({
                inventory: fromInventory,
                item: fromData,
                amount: parseInt(amount),
            }));
        }
    })
}

function updateweights($fromSlot, $toSlot, $fromInv, $toInv, $toAmount) {
    var otherinventory = otherLabel.toLowerCase();
    if (otherinventory.split("-")[0] == "dropped") {
        toData = $toInv.find("[data-slot=" + $toSlot + "]").data("item");
        if (toData !== null && toData !== undefined) {
            InventoryError($fromInv, $fromSlot);
            return false;
        }
    }

    if (($fromInv.attr("data-inventory") == "hotbar" && $toInv.attr("data-inventory") == "player") || ($fromInv.attr("data-inventory") == "player" && $toInv.attr("data-inventory") == "hotbar") || ($fromInv.attr("data-inventory") == "player" && $toInv.attr("data-inventory") == "player") || ($fromInv.attr("data-inventory") == "hotbar" && $toInv.attr("data-inventory") == "hotbar")) {
        return true;
    }

    if (($fromInv.attr("data-inventory").split("-")[0] == "itemshop" && $toInv.attr("data-inventory").split("-")[0] == "itemshop") || ($fromInv.attr("data-inventory") == "crafting" && $toInv.attr("data-inventory") == "crafting")) {
        itemData = $fromInv.find("[data-slot=" + $fromSlot + "]").data("item");
        if ($fromInv.attr("data-inventory").split("-")[0] == "itemshop") {
            $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-img"><img src="images/' + itemData.image + '" alt="' + itemData.name + '" /></div><div class="item-slot-amount"><p>('+itemData.amount+') $'+itemData.price+'</p></div><div class="item-slot-label"><p>' + itemData.label + '</p></div>');
        } else {
            $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-img"><img src="images/' + itemData.image + '" alt="' + itemData.name + '" /></div><div class="item-slot-amount"><p>'+itemData.amount + ' (' + ((itemData.weight * itemData.amount) / 1000).toFixed(1) + ')</p></div><div class="item-slot-label"><p>' + itemData.label + '</p></div>');

        }

        InventoryError($fromInv, $fromSlot);
        return false;
    }

    if ($toAmount == 0 && ($fromInv.attr("data-inventory").split("-")[0] == "itemshop" || $fromInv.attr("data-inventory") == "crafting")) {
        itemData = $fromInv.find("[data-slot=" + $fromSlot + "]").data("item");
        if ($fromInv.attr("data-inventory").split("-")[0] == "itemshop") {
            $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-img"><img src="images/' + itemData.image + '" alt="' + itemData.name + '" /></div><div class="item-slot-amount"><p>('+itemData.amount+') $'+itemData.price+'</p></div><div class="item-slot-label"><p>' + itemData.label + '</p></div>');
        } else {
            $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-img"><img src="images/' + itemData.image + '" alt="' + itemData.name + '" /></div><div class="item-slot-amount"><p>'+itemData.amount + ' (' + ((itemData.weight * itemData.amount) / 1000).toFixed(1) + ')</p></div><div class="item-slot-label"><p>' + itemData.label + '</p></div>');
        }
 
        InventoryError($fromInv, $fromSlot);
        return false;
    }

    if ($toInv.attr("data-inventory").split("-")[0] == "itemshop" || $toInv.attr("data-inventory") == "crafting") {
        itemData = $toInv.find("[data-slot=" + $toSlot + "]").data("item");
        if ($toInv.attr("data-inventory").split("-")[0] == "itemshop") {
            $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-img"><img src="images/' + itemData.image + '" alt="' + itemData.name + '" /></div><div class="item-slot-amount"><p>('+itemData.amount+') $'+itemData.price+'</p></div><div class="item-slot-label"><p>' + itemData.label + '</p></div>');
        } else {
            $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-img"><img src="images/' + itemData.image + '" alt="' + itemData.name + '" /></div><div class="item-slot-amount"><p>'+itemData.amount + ' (' + ((itemData.weight * itemData.amount) / 1000).toFixed(1) + ')</p></div><div class="item-slot-label"><p>' + itemData.label + '</p></div>');
        }
 
        InventoryError($fromInv, $fromSlot);
        return false;
    }

    if ($fromInv.attr("data-inventory") != $toInv.attr("data-inventory")) {
        fromData = $fromInv.find("[data-slot=" + $fromSlot + "]").data("item");
        toData = $toInv.find("[data-slot=" + $toSlot + "]").data("item");
        if ($toAmount == 0) {$toAmount=fromData.amount}
        if (toData == null || fromData.name == toData.name) {
            if ($fromInv.attr("data-inventory") == "player" || $fromInv.attr("data-inventory") == "hotbar") {
                totalWeight = totalWeight - (fromData.weight * $toAmount);
                totalWeightOther = totalWeightOther + (fromData.weight * $toAmount);
            } else {
                totalWeight = totalWeight + (fromData.weight * $toAmount);
                totalWeightOther = totalWeightOther - (fromData.weight * $toAmount);
            }
        } else {
            if ($fromInv.attr("data-inventory") == "player" || $fromInv.attr("data-inventory") == "hotbar") {
                totalWeight = totalWeight - (fromData.weight * $toAmount);
                totalWeight = totalWeight + (toData.weight * toData.amount)

                totalWeightOther = totalWeightOther + (fromData.weight * $toAmount);
                totalWeightOther = totalWeightOther - (toData.weight * toData.amount);
            } else {
                totalWeight = totalWeight + (fromData.weight * $toAmount);
                totalWeight = totalWeight - (toData.weight * toData.amount)

                totalWeightOther = totalWeightOther - (fromData.weight * $toAmount);
                totalWeightOther = totalWeightOther + (toData.weight * toData.amount);
            }
        }
    }

    if (totalWeight > playerMaxWeight || (totalWeightOther > otherMaxWeight && $fromInv.attr("data-inventory").split("-")[0] != "itemshop" && $fromInv.attr("data-inventory") != "crafting")) {
        InventoryError($fromInv, $fromSlot);
        return false;
    }
    var per =(totalWeight/1000)/(playerMaxWeight/100000)
    $(".pro").css("width",per+"%");
    $("#player-inv-weight").html("Weight:" + (parseInt(totalWeight) / 1000).toFixed(2) + " / " + (playerMaxWeight / 1000).toFixed(2));
    if ($fromInv.attr("data-inventory").split("-")[0] != "itemshop" && $toInv.attr("data-inventory").split("-")[0] != "itemshop" && $fromInv.attr("data-inventory") != "crafting" && $toInv.attr("data-inventory") != "crafting") {
        $("#other-inv-label").html(otherLabel)
        $("#other-inv-weight").html("Weight:" + (parseInt(totalWeightOther) / 1000).toFixed(2) + " / " + (otherMaxWeight / 1000).toFixed(2))
        var per1 =(totalWeightOther/1000)/(otherMaxWeight/100000)
        $(".pro1").css("width",per1+"%");
    }

    return true;
}

var combineslotData = null;

$(document).on('click', '.CombineItem', function(e){
    e.preventDefault();
    if (combineslotData.toData.combinable.anim != null) {
        $.post('https://ax-inventory/combineWithAnim', JSON.stringify({
            combineData: combineslotData.toData.combinable,
            usedItem: combineslotData.toData.name,
            requiredItem: combineslotData.fromData.name
        }))
    } else {
        $.post('https://ax-inventory/combineItem', JSON.stringify({
            reward: combineslotData.toData.combinable.reward,
            toItem: combineslotData.toData.name,
            fromItem: combineslotData.fromData.name
        }))
    }
    Inventory.Close();
});

$(document).on('click', '.SwitchItem', function(e){
    e.preventDefault();
    $(".combine-option-container").hide();

    optionSwitch(combineslotData.fromSlot, combineslotData.toSlot, combineslotData.fromInv, combineslotData.toInv, combineslotData.toAmount, combineslotData.toData, combineslotData.fromData)
});

function optionSwitch($fromSlot, $toSlot, $fromInv, $toInv, $toAmount, toData, fromData) {
    fromData.slot = parseInt($toSlot);
    
    $toInv.find("[data-slot=" + $toSlot + "]").data("item", fromData);

    $toInv.find("[data-slot=" + $toSlot + "]").addClass("item-drag");
    $toInv.find("[data-slot=" + $toSlot + "]").removeClass("item-nodrag");

    
    if ($toSlot < 6) {
        $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-key"><p>' + $toSlot + '</p></div><div class="item-slot-img"><img src="images/' + fromData.image + '" alt="' + fromData.name + '" /></div><div class="item-slot-amount"><p>' + fromData.amount + ' (' + ((fromData.weight * fromData.amount) / 1000).toFixed(1) + ')</p></div><div class="item-slot-label"><p>' + fromData.label + '</p></div>');
    } else {
        $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-img"><img src="images/' + fromData.image + '" alt="' + fromData.name + '" /></div><div class="item-slot-amount"><p>' + fromData.amount + ' (' + ((fromData.weight * fromData.amount) / 1000).toFixed(1) + ')</p></div><div class="item-slot-label"><p>' + fromData.label + '</p></div>');
    }

    toData.slot = parseInt($fromSlot);

    $fromInv.find("[data-slot=" + $fromSlot + "]").addClass("item-drag");
    $fromInv.find("[data-slot=" + $fromSlot + "]").removeClass("item-nodrag");
    
    $fromInv.find("[data-slot=" + $fromSlot + "]").data("item", toData);

    if ($fromSlot < 6) {
        $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-key"><p>' + $fromSlot + '</p></div><div class="item-slot-img"><img src="images/' + toData.image + '" alt="' + toData.name + '" /></div><div class="item-slot-amount"><p>' + toData.amount + ' (' + ((toData.weight * toData.amount) / 1000).toFixed(1) + ')</p></div><div class="item-slot-label"><p>' + toData.label + '</p></div>');
    } else {
        $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-img"><img src="images/' + toData.image + '" alt="' + toData.name + '" /></div><div class="item-slot-amount"><p>' + toData.amount + ' (' + ((toData.weight * toData.amount) / 1000).toFixed(1) + ')</p></div><div class="item-slot-label"><p>' + toData.label + '</p></div>');
    }

    $.post("https://ax-inventory/SetInventoryData", JSON.stringify({
        fromInventory: $fromInv.attr("data-inventory"),
        toInventory: $toInv.attr("data-inventory"),
        fromSlot: $fromSlot,
        toSlot: $toSlot,
        fromAmount: $toAmount,
        toAmount: toData.amount,
    }));
}

function swap($fromSlot, $toSlot, $fromInv, $toInv, $toAmount) {
    fromData = $fromInv.find("[data-slot=" + $fromSlot + "]").data("item");
    toData = $toInv.find("[data-slot=" + $toSlot + "]").data("item");
    var otherinventory = otherLabel.toLowerCase();

    if (otherinventory.split("-")[0] == "dropped") {
        if (toData !== null && toData !== undefined) {
            InventoryError($fromInv, $fromSlot);
            return;
        }
    } 

    if (fromData !== undefined && fromData.amount >= $toAmount) {       
        if (($fromInv.attr("data-inventory") == "player" || $fromInv.attr("data-inventory") == "hotbar") && $toInv.attr("data-inventory").split("-")[0] == "itemshop" && $toInv.attr("data-inventory") == "crafting") {
            InventoryError($fromInv, $fromSlot);
            return;
        }

        if ($toAmount == 0 && $fromInv.attr("data-inventory").split("-")[0] == "itemshop" && $fromInv.attr("data-inventory") == "crafting") {
            InventoryError($fromInv, $fromSlot);
            return;
        } else if ($toAmount == 0) {
            $toAmount=fromData.amount
        }
        if((toData != undefined || toData != null) && toData.name == fromData.name && !fromData.unique) {
            var newData = [];
            newData.name = toData.name;
            newData.label = toData.label;
            newData.amount = (parseInt($toAmount) + parseInt(toData.amount));
            newData.type = toData.type;
            newData.description = toData.description;
            newData.image = toData.image;
            newData.weight = toData.weight;
            newData.info = toData.info;
            newData.useable = toData.useable;
            newData.unique = toData.unique;
            newData.slot = parseInt($toSlot);

            if (fromData.amount == $toAmount) {
                $toInv.find("[data-slot=" + $toSlot + "]").data("item", newData);
    
                $toInv.find("[data-slot=" + $toSlot + "]").addClass("item-drag");
                $toInv.find("[data-slot=" + $toSlot + "]").removeClass("item-nodrag");

                var ItemLabel = '<div class="item-slot-label"><p>' + newData.label + '</p></div>';
                if ((newData.name).split("_")[0] !== "hehe") {
                    if (!Inventory.IsWeaponBlocked(newData.name)) {
                        ItemLabel = '<div class="item-slot-quality"><div class="item-slot-quality-bar"><p>100</p></div></div><div class="item-slot-label"><p>' + newData.label + '</p></div>';                       
                    }
                }

                if ($toSlot < 6 && $toInv.attr("data-inventory") == "player") {
                    $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-key"><p>' + $toSlot + '</p></div><div class="item-slot-img"><img src="images/' + newData.image + '" alt="' + newData.name + '" /></div><div class="item-slot-amount"><p>' + newData.amount + ' (' + ((newData.weight * newData.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                } else if ($toSlot == 41 && $toInv.attr("data-inventory") == "player") {
                    $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-key"><p>6 <i class="fas fa-lock"></i></p></div><div class="item-slot-img"><img src="images/' + newData.image + '" alt="' + newData.name + '" /></div><div class="item-slot-amount"><p>' + newData.amount + ' (' + ((newData.weight * newData.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                } else {
                    $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-img"><img src="images/' + newData.image + '" alt="' + newData.name + '" /></div><div class="item-slot-amount"><p>' + newData.amount + ' (' + ((newData.weight * newData.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                }
                
                if ((newData.name).split("_")[0] !== "hehe") {
                    if (!Inventory.IsWeaponBlocked(newData.name)) {
                        if (newData.info.quality == undefined) { newData.info.quality = 100.0; }
                        var QualityColor = "rgb(39, 174, 96)";
                        if (newData.info.quality < 25) {
                            QualityColor = "rgb(192, 57, 43)";
                        } else if (newData.info.quality > 25 && newData.info.quality < 50) {
                            QualityColor = "rgb(230, 126, 34)";
                        } else if (newData.info.quality >= 50) {
                            QualityColor = "rgb(39, 174, 96)";
                        }
                        if (newData.info.quality !== undefined) {
                            qualityLabel = (newData.info.quality).toFixed();
                        } else {
                            qualityLabel = (newData.info.quality);
                        }
                        if (newData.info.quality == 0) {
                            qualityLabel = "BROKEN";
                        }
                        $toInv.find("[data-slot=" + $toSlot + "]").find(".item-slot-quality-bar").css({
                            "width": qualityLabel + "%",
                            "background-color": QualityColor
                        }).find('p').html(qualityLabel);
                    }
                }

                $fromInv.find("[data-slot=" + $fromSlot + "]").removeClass("item-drag");
                $fromInv.find("[data-slot=" + $fromSlot + "]").addClass("item-nodrag");

                $fromInv.find("[data-slot=" + $fromSlot + "]").removeData("item");
                $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-img"></div><div class="item-slot-label"><p>&nbsp;</p></div>');
            } else if(fromData.amount > $toAmount) {
                var newDataFrom = [];
                newDataFrom.name = fromData.name;
                newDataFrom.label = fromData.label;
                newDataFrom.amount = parseInt((fromData.amount - $toAmount));
                newDataFrom.type = fromData.type;
                newDataFrom.description = fromData.description;
                newDataFrom.image = fromData.image;
                newDataFrom.weight = fromData.weight;
                newDataFrom.price = fromData.price;
                newDataFrom.info = fromData.info;
                newDataFrom.useable = fromData.useable;
                newDataFrom.unique = fromData.unique;
                newDataFrom.slot = parseInt($fromSlot);

                $toInv.find("[data-slot=" + $toSlot + "]").data("item", newData);
    
                $toInv.find("[data-slot=" + $toSlot + "]").addClass("item-drag");
                $toInv.find("[data-slot=" + $toSlot + "]").removeClass("item-nodrag");

                var ItemLabel = '<div class="item-slot-label"><p>' + newData.label + '</p></div>';
                if ((newData.name).split("_")[0] !== "hehe") {
                    if (!Inventory.IsWeaponBlocked(newData.name)) {
                        ItemLabel = '<div class="item-slot-quality"><div class="item-slot-quality-bar"><p>100</p></div></div><div class="item-slot-label"><p>' + newData.label + '</p></div>';                       
                    }
                }

                if ($toSlot < 6 && $toInv.attr("data-inventory") == "player") {
                    $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-key"><p>' + $toSlot + '</p></div><div class="item-slot-img"><img src="images/' + newData.image + '" alt="' + newData.name + '" /></div><div class="item-slot-amount"><p>' + newData.amount + ' (' + ((newData.weight * newData.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                } else if ($toSlot == 41 && $toInv.attr("data-inventory") == "player") {
                    $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-key"><p>6 <i class="fas fa-lock"></i></p></div><div class="item-slot-img"><img src="images/' + newData.image + '" alt="' + newData.name + '" /></div><div class="item-slot-amount"><p>' + newData.amount + ' (' + ((newData.weight * newData.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                } else {
                    $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-img"><img src="images/' + newData.image + '" alt="' + newData.name + '" /></div><div class="item-slot-amount"><p>' + newData.amount + ' (' + ((newData.weight * newData.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                }

                if ((newData.name).split("_")[0] !== "hehe") {
                    if (!Inventory.IsWeaponBlocked(newData.name)) {
                        if (newData.info.quality == undefined) { newData.info.quality = 100.0; }
                        var QualityColor = "rgb(39, 174, 96)";
                        if (newData.info.quality < 25) {
                            QualityColor = "rgb(192, 57, 43)";
                        } else if (newData.info.quality > 25 && newData.info.quality < 50) {
                            QualityColor = "rgb(230, 126, 34)";
                        } else if (newData.info.quality >= 50) {
                            QualityColor = "rgb(39, 174, 96)";
                        }
                        if (newData.info.quality !== undefined) {
                            qualityLabel = (newData.info.quality).toFixed();
                        } else {
                            qualityLabel = (newData.info.quality);
                        }
                        if (newData.info.quality == 0) {
                            qualityLabel = "BROKEN";
                        }
                        $toInv.find("[data-slot=" + $toSlot + "]").find(".item-slot-quality-bar").css({
                            "width": qualityLabel + "%",
                            "background-color": QualityColor
                        }).find('p').html(qualityLabel);
                    }
                }
                
                // From Data zooi
                $fromInv.find("[data-slot=" + $fromSlot + "]").data("item", newDataFrom);
    
                $fromInv.find("[data-slot=" + $fromSlot + "]").addClass("item-drag");
                $fromInv.find("[data-slot=" + $fromSlot + "]").removeClass("item-nodrag");

                if ($fromInv.attr("data-inventory").split("-")[0] == "itemshop") {
                    $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-img"><img src="images/' + newDataFrom.image + '" alt="' + newDataFrom.name + '" /></div><div class="item-slot-amount"><p>('+newDataFrom.amount+') $'+newDataFrom.price+'</p></div><div class="item-slot-label"><p>' + newDataFrom.label + '</p></div>');
                } else {
                    var ItemLabel = '<div class="item-slot-label"><p>' + newDataFrom.label + '</p></div>';
                    if ((newDataFrom.name).split("_")[0] !== "hehe") {
                        if (!Inventory.IsWeaponBlocked(newDataFrom.name)) {
                            ItemLabel = '<div class="item-slot-quality"><div class="item-slot-quality-bar"><p>100</p></div></div><div class="item-slot-label"><p>' + newDataFrom.label + '</p></div>';                       
                        }
                    }

                    if ($fromSlot < 6 && $fromInv.attr("data-inventory") == "player") {
                        $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-key"><p>' + $fromSlot + '</p></div><div class="item-slot-img"><img src="images/' + newDataFrom.image + '" alt="' + newDataFrom.name + '" /></div><div class="item-slot-amount"><p>' + newDataFrom.amount + ' (' + ((newDataFrom.weight * newDataFrom.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                    } else if ($fromSlot == 41 && $fromInv.attr("data-inventory") == "player") {
                        $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-key"><p>6 <i class="fas fa-lock"></i></p></div><div class="item-slot-img"><img src="images/' + newDataFrom.image + '" alt="' + newDataFrom.name + '" /></div><div class="item-slot-amount"><p>' + newDataFrom.amount + ' (' + ((newDataFrom.weight * newDataFrom.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                    } else {
                        $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-img"><img src="images/' + newDataFrom.image + '" alt="' + newDataFrom.name + '" /></div><div class="item-slot-amount"><p>' + newDataFrom.amount + ' (' + ((newDataFrom.weight * newDataFrom.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                    }

                    if ((newDataFrom.name).split("_")[0] !== "hehe") {
                        if (!Inventory.IsWeaponBlocked(newDataFrom.name)) {
                            if (newDataFrom.info.quality == undefined) { newDataFrom.info.quality = 100.0; }
                            var QualityColor = "rgb(39, 174, 96)";
                            if (newDataFrom.info.quality < 25) {
                                QualityColor = "rgb(192, 57, 43)";
                            } else if (newDataFrom.info.quality > 25 && newDataFrom.info.quality < 50) {
                                QualityColor = "rgb(230, 126, 34)";
                            } else if (newDataFrom.info.quality >= 50) {
                                QualityColor = "rgb(39, 174, 96)";
                            }
                            if (newDataFrom.info.quality !== undefined) {
                                qualityLabel = (newDataFrom.info.quality).toFixed();
                            } else {
                                qualityLabel = (newDataFrom.info.quality);
                            }
                            if (newDataFrom.info.quality == 0) {
                                qualityLabel = "BROKEN";
                            }
                            $fromInv.find("[data-slot=" + $fromSlot + "]").find(".item-slot-quality-bar").css({
                                "width": qualityLabel + "%",
                                "background-color": QualityColor
                            }).find('p').html(qualityLabel);
                        }
                    }
                }    
            }
            $.post("https://ax-inventory/PlayDropSound", JSON.stringify({}));
            $.post("https://ax-inventory/SetInventoryData", JSON.stringify({
                fromInventory: $fromInv.attr("data-inventory"),
                toInventory: $toInv.attr("data-inventory"),
                fromSlot: $fromSlot,
                toSlot: $toSlot,
                fromAmount: $toAmount,
            }));
        } else {
            if (fromData.amount == $toAmount) {
                if (toData != undefined && toData.combinable != null && isItemAllowed(fromData.name, toData.combinable.accept)) {
                    $.post('https://ax-inventory/getCombineItem', JSON.stringify({item: toData.combinable.reward}), function(item){
                        $('.combine-option-text').html("<p>If you combine these items you get: <b>"+item.label+"</b></p>");
                    })
                    $(".combine-option-container").fadeIn(100);
                    combineslotData = []
                    combineslotData.fromData = fromData
                    combineslotData.toData = toData
                    combineslotData.fromSlot = $fromSlot
                    combineslotData.toSlot = $toSlot
                    combineslotData.fromInv = $fromInv
                    combineslotData.toInv = $toInv
                    combineslotData.toAmount = $toAmount
                    return
                }

                fromData.slot = parseInt($toSlot);
    
                $toInv.find("[data-slot=" + $toSlot + "]").data("item", fromData);
    
                $toInv.find("[data-slot=" + $toSlot + "]").addClass("item-drag");
                $toInv.find("[data-slot=" + $toSlot + "]").removeClass("item-nodrag");

                var ItemLabel = '<div class="item-slot-label"><p>' + fromData.label + '</p></div>';
                if ((fromData.name).split("_")[0] !== "hehe") {
                    if (!Inventory.IsWeaponBlocked(fromData.name)) {
                        ItemLabel = '<div class="item-slot-quality"><div class="item-slot-quality-bar"><p>100</p></div></div><div class="item-slot-label"><p>' + fromData.label + '</p></div>';                       
                    }
                }

                if ($toSlot < 6 && $toInv.attr("data-inventory") == "player") {
                    $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-key"><p>' + $toSlot + '</p></div><div class="item-slot-img"><img src="images/' + fromData.image + '" alt="' + fromData.name + '" /></div><div class="item-slot-amount"><p>' + fromData.amount + ' (' + ((fromData.weight * fromData.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                } else if ($toSlot == 41 && $toInv.attr("data-inventory") == "player") {
                    $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-key"><p>6 <i class="fas fa-lock"></i></p></div><div class="item-slot-img"><img src="images/' + fromData.image + '" alt="' + fromData.name + '" /></div><div class="item-slot-amount"><p>' + fromData.amount + ' (' + ((fromData.weight * fromData.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                } else {
                    $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-img"><img src="images/' + fromData.image + '" alt="' + fromData.name + '" /></div><div class="item-slot-amount"><p>' + fromData.amount + ' (' + ((fromData.weight * fromData.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                }

                if ((fromData.name).split("_")[0] !== "hehe") {
                    if (!Inventory.IsWeaponBlocked(fromData.name)) {
                        if (fromData.info.quality == undefined) { fromData.info.quality = 100.0; }
                        var QualityColor = "rgb(39, 174, 96)";
                        if (fromData.info.quality < 25) {
                            QualityColor = "rgb(192, 57, 43)";
                        } else if (fromData.info.quality > 25 && fromData.info.quality < 50) {
                            QualityColor = "rgb(230, 126, 34)";
                        } else if (fromData.info.quality >= 50) {
                            QualityColor = "rgb(39, 174, 96)";
                        }
                        if (fromData.info.quality !== undefined) {
                            qualityLabel = (fromData.info.quality).toFixed();
                        } else {
                            qualityLabel = (fromData.info.quality);
                        }
                        if (fromData.info.quality == 0) {
                            qualityLabel = "BROKEN";
                        }
                        $toInv.find("[data-slot=" + $toSlot + "]").find(".item-slot-quality-bar").css({
                            "width": qualityLabel + "%",
                            "background-color": QualityColor
                        }).find('p').html(qualityLabel);
                    }
                }
    
                if (toData != undefined) {
                    toData.slot = parseInt($fromSlot);
    
                    $fromInv.find("[data-slot=" + $fromSlot + "]").addClass("item-drag");
                    $fromInv.find("[data-slot=" + $fromSlot + "]").removeClass("item-nodrag");
                    
                    $fromInv.find("[data-slot=" + $fromSlot + "]").data("item", toData);

                    var ItemLabel = '<div class="item-slot-label"><p>' + toData.label + '</p></div>';
                    if ((toData.name).split("_")[0] !== "hehe") {
                        if (!Inventory.IsWeaponBlocked(toData.name)) {
                            ItemLabel = '<div class="item-slot-quality"><div class="item-slot-quality-bar"><p>100</p></div></div><div class="item-slot-label"><p>' + toData.label + '</p></div>';                       
                        }
                    }
 
                    if ($fromSlot < 6 && $fromInv.attr("data-inventory") == "player") {
                        $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-key"><p>' + $fromSlot + '</p></div><div class="item-slot-img"><img src="images/' + toData.image + '" alt="' + toData.name + '" /></div><div class="item-slot-amount"><p>' + toData.amount + ' (' + ((toData.weight * toData.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                    } else if ($fromSlot == 41 && $fromInv.attr("data-inventory") == "player") {
                        $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-key"><p>6 <i class="fas fa-lock"></i></p></div><div class="item-slot-img"><img src="images/' + toData.image + '" alt="' + toData.name + '" /></div><div class="item-slot-amount"><p>' + toData.amount + ' (' + ((toData.weight * toData.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                    } else {
                        $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-img"><img src="images/' + toData.image + '" alt="' + toData.name + '" /></div><div class="item-slot-amount"><p>' + toData.amount + ' (' + ((toData.weight * toData.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                    }

                    if ((toData.name).split("_")[0] !== "hehe") {
                        if (!Inventory.IsWeaponBlocked(toData.name)) {
                            if (toData.info.quality == undefined) { toData.info.quality = 100.0; }
                            var QualityColor = "rgb(39, 174, 96)";
                            if (toData.info.quality < 25) {
                                QualityColor = "rgb(192, 57, 43)";
                            } else if (toData.info.quality > 25 && toData.info.quality < 50) {
                                QualityColor = "rgb(230, 126, 34)";
                            } else if (toData.info.quality >= 50) {
                                QualityColor = "rgb(39, 174, 96)";
                            }
                            if (toData.info.quality !== undefined) {
                                qualityLabel = (toData.info.quality).toFixed();
                            } else {
                                qualityLabel = (toData.info.quality);
                            }
                            if (toData.info.quality == 0) {
                                qualityLabel = "BROKEN";
                            }
                            $fromInv.find("[data-slot=" + $fromSlot + "]").find(".item-slot-quality-bar").css({
                                "width": qualityLabel + "%",
                                "background-color": QualityColor
                            }).find('p').html(qualityLabel);
                        }
                    }

                    $.post("https://ax-inventory/SetInventoryData", JSON.stringify({
                        fromInventory: $fromInv.attr("data-inventory"),
                        toInventory: $toInv.attr("data-inventory"),
                        fromSlot: $fromSlot,
                        toSlot: $toSlot,
                        fromAmount: $toAmount,
                        toAmount: toData.amount,
                    }));
                } else {
                    $fromInv.find("[data-slot=" + $fromSlot + "]").removeClass("item-drag");
                    $fromInv.find("[data-slot=" + $fromSlot + "]").addClass("item-nodrag");
    
                    $fromInv.find("[data-slot=" + $fromSlot + "]").removeData("item");

                    if ($fromSlot < 6 && $fromInv.attr("data-inventory") == "player") {
                        $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-key"><p>' + $fromSlot + '</p></div><div class="item-slot-img"></div><div class="item-slot-label"><p>&nbsp;</p></div>');
                    } else if ($fromSlot == 41 && $fromInv.attr("data-inventory") == "player") {
                        $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-key"><p>6 <i class="fas fa-lock"></i></p></div><div class="item-slot-img"></div><div class="item-slot-label"><p>&nbsp;</p></div>');
                    } else {
                        $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-img"></div><div class="item-slot-label"><p>&nbsp;</p></div>');
                    }

                    $.post("https://ax-inventory/SetInventoryData", JSON.stringify({
                        fromInventory: $fromInv.attr("data-inventory"),
                        toInventory: $toInv.attr("data-inventory"),
                        fromSlot: $fromSlot,
                        toSlot: $toSlot,
                        fromAmount: $toAmount,
                    }));
                }
                $.post("https://ax-inventory/PlayDropSound", JSON.stringify({}));
            } else if(fromData.amount > $toAmount && (toData == undefined || toData == null)) {
                var newDataTo = [];
                newDataTo.name = fromData.name;
                newDataTo.label = fromData.label;
                newDataTo.amount = parseInt($toAmount);
                newDataTo.type = fromData.type;
                newDataTo.description = fromData.description;
                newDataTo.image = fromData.image;
                newDataTo.weight = fromData.weight;
                newDataTo.info = fromData.info;
                newDataTo.useable = fromData.useable;
                newDataTo.unique = fromData.unique;
                newDataTo.slot = parseInt($toSlot);
    
                $toInv.find("[data-slot=" + $toSlot + "]").data("item", newDataTo);
    
                $toInv.find("[data-slot=" + $toSlot + "]").addClass("item-drag");
                $toInv.find("[data-slot=" + $toSlot + "]").removeClass("item-nodrag");

                var ItemLabel = '<div class="item-slot-label"><p>' + newDataTo.label + '</p></div>';
                if ((newDataTo.name).split("_")[0] !== "hehe") {
                    if (!Inventory.IsWeaponBlocked(newDataTo.name)) {
                        ItemLabel = '<div class="item-slot-quality"><div class="item-slot-quality-bar"><p>100</p></div></div><div class="item-slot-label"><p>' + newDataTo.label + '</p></div>';                       
                    }
                }

                if ($toSlot < 6 && $toInv.attr("data-inventory") == "player") {
                    $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-key"><p>' + $toSlot + '</p></div><div class="item-slot-img"><img src="images/' + newDataTo.image + '" alt="' + newDataTo.name + '" /></div><div class="item-slot-amount"><p>' + newDataTo.amount + ' (' + ((newDataTo.weight * newDataTo.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                } else if ($toSlot == 41 && $toInv.attr("data-inventory") == "player") {
                    $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-key"><p>6 <i class="fas fa-lock"></i></p></div><div class="item-slot-img"><img src="images/' + newDataTo.image + '" alt="' + newDataTo.name + '" /></div><div class="item-slot-amount"><p>' + newDataTo.amount + ' (' + ((newDataTo.weight * newDataTo.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                } else {
                    $toInv.find("[data-slot=" + $toSlot + "]").html('<div class="item-slot-img"><img src="images/' + newDataTo.image + '" alt="' + newDataTo.name + '" /></div><div class="item-slot-amount"><p>' + newDataTo.amount + ' (' + ((newDataTo.weight * newDataTo.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                }

                if ((newDataTo.name).split("_")[0] !== "hehe") {
                    if (!Inventory.IsWeaponBlocked(newDataTo.name)) {
                        if (newDataTo.info.quality == undefined) { 
                            newDataTo.info.quality = 100.0; 
                        }
                        var QualityColor = "rgb(39, 174, 96)";
                        if (newDataTo.info.quality < 25) {
                            QualityColor = "rgb(192, 57, 43)";
                        } else if (newDataTo.info.quality > 25 && newDataTo.info.quality < 50) {
                            QualityColor = "rgb(230, 126, 34)";
                        } else if (newDataTo.info.quality >= 50) {
                            QualityColor = "rgb(39, 174, 96)";
                        }
                        if (newDataTo.info.quality !== undefined) {
                            qualityLabel = (newDataTo.info.quality).toFixed();
                        } else {
                            qualityLabel = (newDataTo.info.quality);
                        }
                        if (newDataTo.info.quality == 0) {
                            qualityLabel = "BROKEN";
                        }
                        $toInv.find("[data-slot=" + $toSlot + "]").find(".item-slot-quality-bar").css({
                            "width": qualityLabel + "%",
                            "background-color": QualityColor
                        }).find('p').html(qualityLabel);
                    }
                }

                var newDataFrom = [];
                newDataFrom.name = fromData.name;
                newDataFrom.label = fromData.label;
                newDataFrom.amount = parseInt((fromData.amount - $toAmount));
                newDataFrom.type = fromData.type;
                newDataFrom.description = fromData.description;
                newDataFrom.image = fromData.image;
                newDataFrom.weight = fromData.weight;
                newDataFrom.price = fromData.price;
                newDataFrom.info = fromData.info;
                newDataFrom.useable = fromData.useable;
                newDataFrom.unique = fromData.unique;
                newDataFrom.slot = parseInt($fromSlot);
    
                $fromInv.find("[data-slot=" + $fromSlot + "]").data("item", newDataFrom);
    
                $fromInv.find("[data-slot=" + $fromSlot + "]").addClass("item-drag");
                $fromInv.find("[data-slot=" + $fromSlot + "]").removeClass("item-nodrag");
    
                if ($fromInv.attr("data-inventory").split("-")[0] == "itemshop") {
                    $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-img"><img src="images/' + newDataFrom.image + '" alt="' + newDataFrom.name + '" /></div><div class="item-slot-amount"><p>('+newDataFrom.amount+') $'+newDataFrom.price+'</p></div><div class="item-slot-label"><p>' + newDataFrom.label + '</p></div>');
                } else {

                    var ItemLabel = '<div class="item-slot-label"><p>' + newDataFrom.label + '</p></div>';
                    if ((newDataFrom.name).split("_")[0] !== "hehe") {
                        if (!Inventory.IsWeaponBlocked(newDataFrom.name)) {
                            ItemLabel = '<div class="item-slot-quality"><div class="item-slot-quality-bar"><p>100</p></div></div><div class="item-slot-label"><p>' + newDataFrom.label + '</p></div>';                       
                        }
                    }

                    if ($fromSlot < 6 && $fromInv.attr("data-inventory") == "player") {
                        $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-key"><p>' + $fromSlot + '</p></div><div class="item-slot-img"><img src="images/' + newDataFrom.image + '" alt="' + newDataFrom.name + '" /></div><div class="item-slot-amount"><p>' + newDataFrom.amount + ' (' + ((newDataFrom.weight * newDataFrom.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                    } else if ($fromSlot == 41 && $fromInv.attr("data-inventory") == "player") {
                        $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-key"><p>6 <i class="fas fa-lock"></i></p></div><div class="item-slot-img"><img src="images/' + newDataFrom.image + '" alt="' + newDataFrom.name + '" /></div><div class="item-slot-amount"><p>' + newDataFrom.amount + ' (' + ((newDataFrom.weight * newDataFrom.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                    } else {
                        $fromInv.find("[data-slot=" + $fromSlot + "]").html('<div class="item-slot-img"><img src="images/' + newDataFrom.image + '" alt="' + newDataFrom.name + '" /></div><div class="item-slot-amount"><p>' + newDataFrom.amount + ' (' + ((newDataFrom.weight * newDataFrom.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                    }

                    if ((newDataFrom.name).split("_")[0] !== "hehe") {
                        if (!Inventory.IsWeaponBlocked(newDataFrom.name)) {
                            if (newDataFrom.info.quality == undefined) { newDataFrom.info.quality = 100.0; }
                            var QualityColor = "rgb(39, 174, 96)";
                            if (newDataFrom.info.quality < 25) {
                                QualityColor = "rgb(192, 57, 43)";
                            } else if (newDataFrom.info.quality > 25 && newDataFrom.info.quality < 50) {
                                QualityColor = "rgb(230, 126, 34)";
                            } else if (newDataFrom.info.quality >= 50) {
                                QualityColor = "rgb(39, 174, 96)";
                            }
                            if (newDataFrom.info.quality !== undefined) {
                                qualityLabel = (newDataFrom.info.quality).toFixed();
                            } else {
                                qualityLabel = (newDataFrom.info.quality);
                            }
                            if (newDataFrom.info.quality == 0) {
                                qualityLabel = "BROKEN";
                            }
                            $fromInv.find("[data-slot=" + $fromSlot + "]").find(".item-slot-quality-bar").css({
                                "width": qualityLabel + "%",
                                "background-color": QualityColor
                            }).find('p').html(qualityLabel);
                        }
                    }
                }
                $.post("https://ax-inventory/PlayDropSound", JSON.stringify({}));
                $.post("https://ax-inventory/SetInventoryData", JSON.stringify({
                    fromInventory: $fromInv.attr("data-inventory"),
                    toInventory: $toInv.attr("data-inventory"),
                    fromSlot: $fromSlot,
                    toSlot: $toSlot,
                    fromAmount: $toAmount,
                }));
            } else {
                InventoryError($fromInv, $fromSlot);
            }
        }
    } else {
        //InventoryError($fromInv, $fromSlot);
    }
    handleDragDrop();
}

function isItemAllowed(item, allowedItems) {
    var retval = false
    $.each(allowedItems, function(index, i){
        if (i == item) {
            retval = true;
        }
    });
    return retval
}

function InventoryError($elinv, $elslot) {
    $elinv.find("[data-slot=" + $elslot + "]").css("background", "rgba(156, 20, 20, 0.5)").css("transition", "background 500ms");
    setTimeout(function() {
        $elinv.find("[data-slot=" + $elslot + "]").css("background", "rgba(255, 255, 255, 0.03)");
    }, 500)
    $.post("https://ax-inventory/PlayDropFail", JSON.stringify({}));
}

var requiredItemOpen = false;

(() => {
    Inventory = {};

    Inventory.slots = 40;

    Inventory.dropslots = 30;
    Inventory.droplabel = "Ground";
    Inventory.dropmaxweight = 100000

    Inventory.Error = function() {
        $.post("https://ax-inventory/PlayDropFail", JSON.stringify({}));
    }
    Inventory.IsWeaponBlocked = function(WeaponName) {
        return false;
    }

    Inventory.QualityCheck = function(item, IsHotbar, IsOtherInventory) {
        if (!Inventory.IsWeaponBlocked(item.name)) {
            if ((item.name).split("_")[0] !== "hehe") {
                if (item.info.quality == undefined) { item.info.quality = 100; }
                var QualityColor = "rgb(39, 174, 96)";
                if (item.info.quality < 25) {
                    QualityColor = "rgb(192, 57, 43)";
                } else if (item.info.quality > 25 && item.info.quality < 50) {
                    QualityColor = "rgb(230, 126, 34)";
                } else if (item.info.quality >= 50) {
                    QualityColor = "rgb(39, 174, 96)";
                }
                if (item.info.quality !== undefined) {
                    qualityLabel = (item.info.quality).toFixed();
                } else {
                    qualityLabel = (item.info.quality);
                }
                if (item.info.quality == 0) {
                    qualityLabel = "BROKEN";
                    if (!IsOtherInventory) {
                        if (!IsHotbar) {
                            $(".player-inventory").find("[data-slot=" + item.slot + "]").find(".item-slot-quality-bar").css({
                                "width": "100%",
                                "background-color": QualityColor
                            }).find('p').html(qualityLabel);
                        } else {
                            $(".z-hotbar-inventory").find("[data-zhotbarslot=" + item.slot + "]").find(".item-slot-quality-bar").css({
                                "width": "100%",
                                "background-color": QualityColor
                            }).find('p').html(qualityLabel);
                        }
                    } else {
                        $(".other-inventory").find("[data-slot=" + item.slot + "]").find(".item-slot-quality-bar").css({
                            "width": "100%",
                            "background-color": QualityColor
                        }).find('p').html(qualityLabel);
                    }
                } else {
                    if (!IsOtherInventory) {
                        if (!IsHotbar) {
                            $(".player-inventory").find("[data-slot=" + item.slot + "]").find(".item-slot-quality-bar").css({
                                "width": qualityLabel + "%",
                                "background-color": QualityColor
                            }).find('p').html(qualityLabel);
                        } else {
                            $(".z-hotbar-inventory").find("[data-zhotbarslot=" + item.slot + "]").find(".item-slot-quality-bar").css({
                                "width": qualityLabel + "%",
                                "background-color": QualityColor
                            }).find('p').html(qualityLabel);
                        }
                    } else {
                        $(".other-inventory").find("[data-slot=" + item.slot + "]").find(".item-slot-quality-bar").css({
                            "width": qualityLabel + "%",
                            "background-color": QualityColor
                        }).find('p').html(qualityLabel);
                    }
                }
            }
        }
    }

    Inventory.Open = function(data) {
        totalWeight = 0;
        totalWeightOther = 0;

        $('#player-inv-label').html(data.aaa)
        $('.health').css('height',data.charhealth+'%')
        $('.shield').css('height',data.chararmor+'%')
        $(".player-inventory").find(".item-slot").remove();
        $(".ply-hotbar-inventory").find(".item-slot").remove();

        if (requiredItemOpen) {
            $(".requiredItem-container").hide();
            requiredItemOpen = false;
        }

        $("#ax-inventory").fadeIn(300);
        if(data.other != null && data.other != "") {
            $(".other-inventory").attr("data-inventory", data.other.name);
        } else {
            $(".other-inventory").attr("data-inventory", 0);
        }
        // First 5 Slots
        for(i = 1; i < 6; i++) {
            $(".player-inventory").append('<div class="item-slot" data-slot="' + i + '"><div class="item-slot-key"><p>' + i + '</p></div><div class="item-slot-img"></div><div class="item-slot-label"><p>&nbsp;</p></div></div>');
        }
        // Inventory
        for(i = 6; i < (data.slots + 1); i++) {
            if (i == 41) {
                $(".player-inventory").append('<div class="item-slot" data-slot="' + i + '"><div class="item-slot-key"><p>6 <i class="fas fa-lock"></i></p></div><div class="item-slot-img"></div><div class="item-slot-label"><p>&nbsp;</p></div></div>');
            } else {
                $(".player-inventory").append('<div class="item-slot" data-slot="' + i + '"><div class="item-slot-img"></div><div class="item-slot-label"><p>&nbsp;</p></div></div>');
            }
        }

        if (data.other != null && data.other != "") {
            for(i = 1; i < (data.other.slots + 1); i++) {
                $(".other-inventory").append('<div class="item-slot" data-slot="' + i + '"><div class="item-slot-img"></div><div class="item-slot-label"><p>&nbsp;</p></div></div>');
            }
        } else {
            for(i = 1; i < (Inventory.dropslots + 1); i++) {
                $(".other-inventory").append('<div class="item-slot" data-slot="' + i + '"><div class="item-slot-img"></div><div class="item-slot-label"><p>&nbsp;</p></div></div>');
            }
        }

        if (data.inventory !== null) {
            $.each(data.inventory, function (i, item) {
                if (item != null) {
                    totalWeight += (item.weight * item.amount);
                    var ItemLabel = '<div class="item-slot-label"><p>' + item.label + '</p></div>';
                    if ((item.name).split("_")[0] !== "hehe") {
                        if (!Inventory.IsWeaponBlocked(item.name)) {
                            ItemLabel = '<div class="item-slot-quality"><div class="item-slot-quality-bar"><p>100</p></div></div><div class="item-slot-label"><p>' + item.label + '</p></div>';                       
                        }
                    }
                    if (item.slot < 6) {
                        $(".player-inventory").find("[data-slot=" + item.slot + "]").addClass("item-drag");
                        $(".player-inventory").find("[data-slot=" + item.slot + "]").html('<div class="item-slot-key"><p>' + item.slot + '</p></div><div class="item-slot-img"><img src="images/' + item.image + '" alt="' + item.name + '" /></div><div class="item-slot-amount"><p>' + item.amount + ' (' + ((item.weight * item.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                        $(".player-inventory").find("[data-slot=" + item.slot + "]").data("item", item);
                    } else if (item.slot == 41) {
                        $(".player-inventory").find("[data-slot=" + item.slot + "]").addClass("item-drag");
                        $(".player-inventory").find("[data-slot=" + item.slot + "]").html('<div class="item-slot-key"><p>6 <i class="fas fa-lock"></i></p></div><div class="item-slot-img"><img src="images/' + item.image + '" alt="' + item.name + '" /></div><div class="item-slot-amount"><p>' + item.amount + ' (' + ((item.weight * item.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                        $(".player-inventory").find("[data-slot=" + item.slot + "]").data("item", item);
                    } else {
                        $(".player-inventory").find("[data-slot=" + item.slot + "]").addClass("item-drag");
                        $(".player-inventory").find("[data-slot=" + item.slot + "]").html('<div class="item-slot-img"><img src="images/' + item.image + '" alt="' + item.name + '" /></div><div class="item-slot-amount"><p>' + item.amount + ' (' + ((item.weight * item.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                        $(".player-inventory").find("[data-slot=" + item.slot + "]").data("item", item);
                    }
                    Inventory.QualityCheck(item, false, false);
                }
            });
        }

        if ((data.other != null && data.other != "") && data.other.inventory != null) {
            $.each(data.other.inventory, function (i, item) {
                if (item != null) {
                    totalWeightOther += (item.weight * item.amount);
                    var ItemLabel = '<div class="item-slot-label"><p>' + item.label + '</p></div>';
                    if ((item.name).split("_")[0] !== "hehe") {
                        if (!Inventory.IsWeaponBlocked(item.name)) {
                            ItemLabel = '<div class="item-slot-quality"><div class="item-slot-quality-bar"><p>100</p></div></div><div class="item-slot-label"><p>' + item.label + '</p></div>';                       
                        }
                    }
                    $(".other-inventory").find("[data-slot=" + item.slot + "]").addClass("item-drag");
                    if (item.price != null) {
                        $(".other-inventory").find("[data-slot=" + item.slot + "]").html('<div class="item-slot-img"><img src="images/' + item.image + '" alt="' + item.name + '" /></div><div class="item-slot-amount"><p>('+item.amount+') $'+item.price+'</p></div>' + ItemLabel);
                    } else {
                        $(".other-inventory").find("[data-slot=" + item.slot + "]").html('<div class="item-slot-img"><img src="images/' + item.image + '" alt="' + item.name + '" /></div><div class="item-slot-amount"><p>' + item.amount + ' (' + ((item.weight * item.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                    }
                    $(".other-inventory").find("[data-slot=" + item.slot + "]").data("item", item);
                    Inventory.QualityCheck(item, false, true);
                }
            });
        }
        var per =(totalWeight/1000)/(data.maxweight/100000)
        $(".pro").css("width",per+"%");
        $("#player-inv-weight").html("Weight:" + (totalWeight / 1000).toFixed(2) + " / " + (data.maxweight / 1000).toFixed(2));
        playerMaxWeight = data.maxweight;
        if (data.other != null) 
        {
            var name = data.other.name.toString()
            if (name != null && (name.split("-")[0] == "itemshop" || name == "crafting")) {
                $("#other-inv-label").html(data.other.label);
            } else {
                $("#other-inv-label").html(data.other.label)
                $("#other-inv-weight").html("Weight: " + (totalWeightOther / 1000).toFixed(2) + " / " + (data.other.maxweight / 1000).toFixed(2))
                var per12 =(totalWeightOther/1000)/(data.other.maxweight/100000)
                $(".pro1").css("width",per12+"%");
            }
            otherMaxWeight = data.other.maxweight;
            otherLabel = data.other.label;
        } else {
            $("#other-inv-label").html(Inventory.droplabel)
            $("#other-inv-weight").html("Weight: " + (totalWeightOther / 1000).toFixed(2) + " / " + (Inventory.dropmaxweight / 1000).toFixed(2))
            var per123 =(totalWeightOther/1000)/(Inventory.dropmaxweight/100000)
            $(".pro1").css("width",per123+"%");
            otherMaxWeight = Inventory.dropmaxweight;
            otherLabel = Inventory.droplabel;
        }

        $.each(data.maxammo, function(index, ammotype){
            $("#"+index+"_ammo").find('.ammo-box-amount').css({"height":"0%"});
        });

        if (data.Ammo !== null) {
            $.each(data.Ammo, function(i, amount){
                var Handler = i.split("_");
                var Type = Handler[1].toLowerCase();
                if (amount > data.maxammo[Type]) {
                    amount = data.maxammo[Type]
                }
                var Percentage = (amount / data.maxammo[Type] * 100)

                $("#"+Type+"_ammo").find('.ammo-box-amount').css({"height":Percentage+"%"});
                $("#"+Type+"_ammo").find('span').html(amount+"x");
            });
        }

        handleDragDrop();
    };

    Inventory.Close = function() {
        $(".item-slot").css("border", "1px solid rgba(255, 255, 255, 0.1)");
        $(".ply-hotbar-inventory").css("display", "block");
        $(".ply-iteminfo-container").css("display", "none");
        $("#ax-inventory").fadeOut(300);
        $(".combine-option-container").hide();
        $(".item-slot").remove();
        if ($("#rob-money").length) {
            $("#rob-money").remove();
        }
        $.post("https://ax-inventory/CloseInventory", JSON.stringify({}));

        if (AttachmentScreenActive) {
            $("#ax-inventory").css({"left": "0vw"});
            $(".weapon-attachments-container").css({"left": "-100vw"});
            AttachmentScreenActive = false;
        }

        if (ClickedItemData !== null) {
            $("#weapon-attachments").fadeOut(250, function(){
                $("#weapon-attachments").remove();
                ClickedItemData = {};
            });
        }
        $('.tooltip').fadeOut()
    };

    Inventory.Update = function(data) {
        totalWeight = 0;
        totalWeightOther = 0;
        $(".player-inventory").find(".item-slot").remove();
        $(".ply-hotbar-inventory").find(".item-slot").remove();
        if (data.error) {
            Inventory.Error();
        }
        for(i = 1; i < (data.slots + 1); i++) {
            if (i == 41) {
                $(".player-inventory").append('<div class="item-slot" data-slot="' + i + '"><div class="item-slot-key"><p>6 <i class="fas fa-lock"></i></p></div><div class="item-slot-img"></div><div class="item-slot-label"><p>&nbsp;</p></div></div>');
            } else {
                $(".player-inventory").append('<div class="item-slot" data-slot="' + i + '"><div class="item-slot-img"></div><div class="item-slot-label"><p>&nbsp;</p></div></div>');
            }        
        }

        $.each(data.inventory, function (i, item) {
            if (item != null) {
                totalWeight += (item.weight * item.amount);
                if (item.slot < 6) {
                    $(".player-inventory").find("[data-slot=" + item.slot + "]").addClass("item-drag");
                    $(".player-inventory").find("[data-slot=" + item.slot + "]").html('<div class="item-slot-key"><p>' + item.slot + '</p></div><div class="item-slot-img"><img src="images/' + item.image + '" alt="' + item.name + '" /></div><div class="item-slot-amount"><p>' + item.amount + ' (' + ((item.weight * item.amount) / 1000).toFixed(1) + ')</p></div><div class="item-slot-label"><p>' + item.label + '</p></div>');
                    $(".player-inventory").find("[data-slot=" + item.slot + "]").data("item", item);
                } else if (item.slot == 41) {
                    $(".player-inventory").find("[data-slot=" + item.slot + "]").addClass("item-drag");
                    $(".player-inventory").find("[data-slot=" + item.slot + "]").html('<div class="item-slot-key"><p>6 <i class="fas fa-lock"></i></p></div><div class="item-slot-img"><img src="images/' + item.image + '" alt="' + item.name + '" /></div><div class="item-slot-amount"><p>' + item.amount + ' (' + ((item.weight * item.amount) / 1000).toFixed(1) + ')</p></div><div class="item-slot-label"><p>' + item.label + '</p></div>');
                    $(".player-inventory").find("[data-slot=" + item.slot + "]").data("item", item);
                } else {
                    $(".player-inventory").find("[data-slot=" + item.slot + "]").addClass("item-drag");
                    $(".player-inventory").find("[data-slot=" + item.slot + "]").html('<div class="item-slot-img"><img src="images/' + item.image + '" alt="' + item.name + '" /></div><div class="item-slot-amount"><p>' + item.amount + ' (' + ((item.weight * item.amount) / 1000).toFixed(1) + ')</p></div><div class="item-slot-label"><p>' + item.label + '</p></div>');
                    $(".player-inventory").find("[data-slot=" + item.slot + "]").data("item", item);
                }
            }
        });
        var per =(totalWeight/1000)/(data.maxweight/100000)
        $(".pro").css("width",per+"%");
        $("#player-inv-weight").html("Weight: " + (totalWeight / 1000).toFixed(2) + " / " + (data.maxweight / 1000).toFixed(2));

        handleDragDrop();
    };

    Inventory.ToggleHotbar = function(data) {
        if (data.open) {
            $(".z-hotbar-inventory").html("");
            for(i = 1; i < 6; i++) {
                var elem = '<div class="z-hotbar-item-slot" data-zhotbarslot="'+i+'"> <div class="z-hotbar-item-slot-key"><p>'+i+'</p></div><div class="z-hotbar-item-slot-img"></div><div class="z-hotbar-item-slot-label"><p>&nbsp;</p></div></div>'
                $(".z-hotbar-inventory").append(elem);
            }
            var elem = '<div class="z-hotbar-item-slot" data-zhotbarslot="41"> <div class="z-hotbar-item-slot-key"><p>6 <i class="fas fa-lock"></i></p></div><div class="z-hotbar-item-slot-img"></div><div class="z-hotbar-item-slot-label"><p>&nbsp;</p></div></div>'
            $.each(data.items, function(i, item){
                if (item != null) {
                    var ItemLabel = '<div class="item-slot-label"><p>' + item.label + '</p></div>';
                    if ((item.name).split("_")[0] !== "hehe") {
                        if (!Inventory.IsWeaponBlocked(item.name)) {
                            ItemLabel = '<div class="item-slot-quality"><div class="item-slot-quality-bar"><p>100</p></div></div><div class="item-slot-label"><p>' + item.label + '</p></div>';                       
                        }
                    }
                    if (item.slot == 41) {
                        $(".z-hotbar-inventory").find("[data-zhotbarslot=" + item.slot + "]").html('<div class="z-hotbar-item-slot-key"><p>6 <i class="fas fa-lock"></i></p></div><div class="z-hotbar-item-slot-img"><img src="images/' + item.image + '" alt="' + item.name + '" /></div><div class="z-hotbar-item-slot-amount"><p>' + item.amount + ' (' + ((item.weight * item.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                    } else {
                        $(".z-hotbar-inventory").find("[data-zhotbarslot=" + item.slot + "]").html('<div class="z-hotbar-item-slot-key"><p>' + item.slot + '</p></div><div class="z-hotbar-item-slot-img"><img src="images/' + item.image + '" alt="' + item.name + '" /></div><div class="z-hotbar-item-slot-amount"><p>' + item.amount + ' (' + ((item.weight * item.amount) / 1000).toFixed(1) + ')</p></div>' + ItemLabel);
                    }
                    Inventory.QualityCheck(item, true, false);
                }
            });
            $(".z-hotbar-inventory").fadeIn(150);
        } else {
            $(".z-hotbar-inventory").fadeOut(150, function(){
                $(".z-hotbar-inventory").html("");
            });
        }
    }

    Inventory.UseItem = function(data) {
        $(".itembox-container").hide();
        $(".itembox-container").fadeIn(250);
        $("#itembox-action").html("<p>Gebruikt</p>");
        $("#itembox-label").html("<p>"+data.item.label+"</p>");
        $("#itembox-image").html('<div class="item-slot-img"><img src="images/' + data.item.image + '" alt="' + data.item.name + '" /></div>')
        setTimeout(function(){
            $(".itembox-container").fadeOut(250);
        }, 2000)
    };

    var itemBoxtimer = null;
    var requiredTimeout = null;

    Inventory.itemBox = function(data) {
        if (itemBoxtimer !== null) {
            clearTimeout(itemBoxtimer)
        }
        var type = "Used"
        if (data.type == "add") {
            type = "Received";
        } else if (data.type == "remove") { 
            type = "Deleted";
        }

        var $itembox = $(".itembox-container.template").clone();
        $itembox.removeClass('template');
        $itembox.html('<div id="itembox-action"><p>' + type + '</p></div><div id="itembox-label"><p>'+data.item.label+'</p></div><div class="item-slot-img"><img src="images/' + data.item.image + '" alt="' + data.item.name + '" /></div>');
        $(".itemboxes-container").prepend($itembox);
        $itembox.fadeIn(250);
        setTimeout(function() {
            $.when($itembox.fadeOut(300)).done(function() {
                $itembox.remove()
            });
        }, 3000);
    };

    Inventory.RequiredItem = function(data) {
        if (requiredTimeout !== null) {
            clearTimeout(requiredTimeout)
        }
        if (data.toggle) {
            if (!requiredItemOpen) {
                $(".requiredItem-container").html("");
                $.each(data.items, function(index, item){
                    var element = '<div class="requiredItem-box"><div id="requiredItem-action">Required</div><div id="requiredItem-label"><p>'+item.label+'</p></div><div id="requiredItem-image"><div class="item-slot-img"><img src="images/' + item.image + '" alt="' + item.name + '" /></div></div></div>'
                    $(".requiredItem-container").hide();
                    $(".requiredItem-container").append(element);
                    $(".requiredItem-container").fadeIn(100);
                });
                requiredItemOpen = true;
            }
        } else {
            $(".requiredItem-container").fadeOut(100);
            requiredTimeout = setTimeout(function(){
                $(".requiredItem-container").html("");
                requiredItemOpen = false;
            }, 100)
        }
    };
    Inventory.Clickables = function(){
        $('.cloth').find('img').off()
        $('.cloth').find('img').click(function(){
            $.post("https://ax-inventory/ChangeComponent", JSON.stringify({
                component:$(this).attr('id')
            }));
        })
    }
    Inventory.Cloth = function(){
        Inventory.Clickables();
        setTimeout(function(){ 
            $('.other-inventory').fadeOut(200)
            $('.other-inv-info').fadeOut(200)
            $('.cloth').fadeIn(20)
        }, 300);
    }
    isClothOpen = false;
    Inventory.Necessary = function(){
        $('.other-inventory').fadeIn(200)
        $('.other-inv-info').fadeIn(200)
        $('.cloth').fadeOut(0)
        $('.item-slot').attr('data-html','true')
        $('.item-slot').hover(function(){
            var element = $(this)
            if (element.attr('title') || typeof (element.attr('data-original-title')) != 'string') {
                element.attr('data-original-title', element.attr('title') || '').attr('title', '')
            }
            item = $(this).data("item")
            if(item !== undefined){
                if (!item.info.serie){
                    item.info.serie = ''
                }
                if (!item.info.label){
                    item.info.label = ''
                }
                $(this).attr('title',
                '<b><h style="text-align:left;">'+(item.label).toUpperCase()+'</h></b><hr style="background-color: white;">'+
                '<div style="height: auto; weight: auto; padding-left: 3px; padding-right: 3px; border-radius: 50%;">Weight: '+item.weight/1000+' KG | Amount: '+item.amount+' | Quality '+Math.ceil(item.info.quality)+' | '+item.info.serie+' | '+item.info.label+' </div>'
                )
            }else{
                $(this).attr('title','')
                $(this).attr('data-original-title','')
            }
            $(this).tooltip(); 
        });
        $('#item-give').attr('title','Close Inventory').tooltip()
        $('#item-amount').attr('title','Set Amount/Quantity').tooltip()
        $('.healthbar').attr('title','Your Health').tooltip()
        $('.shieldbar').attr('title','Your Armor').tooltip()
        $('.question').attr('data-html','true').attr('title','This is an complex inventory system made for ax-core. <li>Drag an item to use button to use the item</li>'+
        '<li>Can Set Quantity/Amount Manually</li>'+
        '<li>Close The Inventory By Pressing ESC Button or The Close Button</li>'+
        '<li>You Can Also Press F6 To Open Clothing Menu</li>'
        ).tooltip()
        $(".item-slot").dblclick(function(){
            var item = $(this).data("item");
            if (item !== undefined && item.useable){
                var inventory = $(this).parent().attr("data-inventory")
                $.post("https://ax-inventory/UseItem", JSON.stringify({
                    inventory: inventory,
                    item: item,
                }));
                Inventory.Close();
                $.post("https://ax-inventory/PlayDropSound", JSON.stringify({}));
            }
        })
        
        $('#clothswitch').off()
        $('#clothswitch').click(function(){
            if (isClothOpen == false){
                isClothOpen = true
                $.post("https://ax-inventory/OpenClothMenu", JSON.stringify({delete:isClothOpen}));
                $(this).css('color','rgba(0, 174, 243, 0.5)')
            }else if (isClothOpen == true){
                isClothOpen = false
                $(this).css('color','color:rgba(0, 0, 0, 0.5)')
                $.post("https://ax-inventory/OpenClothMenu", JSON.stringify({delete:isClothOpen}));
                Inventory.Necessary()
            }
        }).hover(function(){
            $(this).attr('title','Clothing Menu').tooltip()
        })
        $('#no-select').attr('style','position:absolute;right:0%;bottom: -5%;filter:opacity(0.3)')
       // $('#no-select').html('<?xml version="1.0" encoding="UTF-8" standalone="no"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "https://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"> <svg version="1.1" id="Layer_1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink" x="0px" y="0px" width="96px" height="96px" viewBox="0 0 96 96" enable-background="new 0 0 96 96" xml:space="preserve"> <image id="image0" width="96" height="96" x="0" y="0" xlink:href="data:image/png;base64,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 MjU6MjErMDM6MDAT/xVxAAAAAElFTkSuQmCC"/></svg>')
    }
    function PlaySound(){
        var audio = new Audio('sound.mp3');
        audio.volume = 0.2
        audio.play();
    }
    window.addEventListener('message', function(event) {
        switch(event.data.action) {
            case 'sound':
                PlaySound()
                break;
            case "cloth":
                Inventory.Cloth();
                break
            case "open":
                Inventory.Open(event.data);
                Inventory.Necessary();
                break;
            case "close":
                isClothOpen = false;
                Inventory.Close();
                break;
            case "update":
                Inventory.Update(event.data);
                break;
            case "itemBox":
                Inventory.itemBox(event.data);
                break;
            case "requiredItem":
                Inventory.RequiredItem(event.data);
                break;
            case "toggleHotbar":
                Inventory.ToggleHotbar(event.data);
                break;
            case "RobMoney":
                $(".inv-options-list").prepend('<center><div style="border:none;background-color: rgba(0, 0, 0, 0.38); " class="inv-option-item" id="rob-money"><p>Steal Cash</p></div></center>');
                $("#rob-money").data('TargetId', event.data.TargetId);
                break;
        }
    })
})();

$(document).on('click', '#rob-money', function(e){
    e.preventDefault();
    var TargetId = $(this).data('TargetId');
    $.post('https://ax-inventory/RobMoney', JSON.stringify({
        TargetId: TargetId
    }));
    $("#rob-money").remove();
});