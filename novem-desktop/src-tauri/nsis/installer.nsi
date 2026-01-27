!include "MUI2.nsh"
!include "FileFunc.nsh"

Name "NOVEM"
OutFile "NOVEM-Setup-${VERSION}.exe"
InstallDir "$LOCALAPPDATA\NOVEM"
InstallDirRegKey HKCU "Software\NOVEM" "InstallDir"
RequestExecutionLevel user

; Modern UI Configuration
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "installer-header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "installer-sidebar.bmp"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\NOVEM.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch NOVEM"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.md"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language
!insertmacro MUI_LANGUAGE "English"

; Version Information
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "NOVEM"
VIAddVersionKey "CompanyName" "NOVEM Team"
VIAddVersionKey "FileDescription" "NOVEM Installer"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "© 2026 NOVEM Team"

; Installer Section
Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Copy files
  File /r "${BUILD_DIR}\*.*"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\NOVEM"
  CreateShortcut "$SMPROGRAMS\NOVEM\NOVEM.lnk" "$INSTDIR\NOVEM.exe"
  CreateShortcut "$SMPROGRAMS\NOVEM\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\NOVEM.lnk" "$INSTDIR\NOVEM.exe"
  
  ; Write registry
  WriteRegStr HKCU "Software\NOVEM" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NOVEM" "DisplayName" "NOVEM"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NOVEM" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NOVEM" "DisplayIcon" "$INSTDIR\NOVEM.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NOVEM" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NOVEM" "Publisher" "NOVEM Team"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

; Uninstaller Section
Section "Uninstall"
  Delete "$INSTDIR\Uninstall.exe"
  Delete "$INSTDIR\*.*"
  RMDir /r "$INSTDIR"
  
  Delete "$DESKTOP\NOVEM.lnk"
  Delete "$SMPROGRAMS\NOVEM\*.*"
  RMDir "$SMPROGRAMS\NOVEM"
  
  DeleteRegKey HKCU "Software\NOVEM"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NOVEM"
SectionEnd