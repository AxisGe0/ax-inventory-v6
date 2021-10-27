inClothMenu = false
function OpenPedClothMenu()
    TriggerServerEvent("inventory:server:OpenInventory")
    SendNUIMessage({action = "cloth"})
    CreatePedScreen(true)
end

function CreatePedScreen(first)
    CreateThread(function()
        local heading = GetEntityHeading(PlayerPedId())
        SetFrontendActive(true)
        ActivateFrontendMenu(GetHashKey("FE_MENU_VERSION_JOINING_SCREEN"), true, -1)
        Wait(100)
        SetMouseCursorVisibleInMenus(false)
        PlayerPedPreview = ClonePed(PlayerPedId(), heading, true, false)
        local x, y, z = table.unpack(GetEntityCoords(PlayerPedPreview))
        SetEntityCoords(PlayerPedPreview, x, y, z - 10)
        FreezeEntityPosition(PlayerPedPreview, true)
        SetEntityVisible(PlayerPedPreview, false, false)
        NetworkSetEntityInvisibleToNetwork(PlayerPedPreview, false)
        Wait(200)
        SetPedAsNoLongerNeeded(PlayerPedPreview)
        GivePedToPauseMenu(PlayerPedPreview, 2)
        SetPauseMenuPedLighting(true)
        if first then
            SetPauseMenuPedSleepState(false)
            Wait(1000)
            SetPauseMenuPedSleepState(true)
        else
            SetPauseMenuPedSleepState(true)
        end
    end)
end

function DeletePedScreen()
    DeleteEntity(PlayerPedPreview)
    SetFrontendActive(false)
end

function RefreshPedScreen()
    if DoesEntityExist(PlayerPedPreview) then
        DeletePedScreen()
        Wait(500)
        if inInventory or inClothMenu then
            CreatePedScreen(false)
        end
    end
end
RegisterNUICallback("ChangeComponent",function(data)
    ExecuteCommand(data.component)
    Wait(1000)
    RefreshPedScreen()
end)
RegisterNUICallback("OpenClothMenu",function(data)
    if data.delete then
       OpenPedClothMenu()
       inClothMenu = true
    elseif not data.close then
        DeletePedScreen()
        inClothMenu = false
    end
end)