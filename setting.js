// JS ĐIỀU KHIỂN NÚT CÀI ĐẶT
document.addEventListener("DOMContentLoaded", function() {
    const settingsBtn = document.getElementById('fx-settings-btn');
    const settingsPanel = document.getElementById('fx-settings-panel');
    const closeBtn = document.getElementById('fx-close-btn');
    const toggleDust = document.getElementById('toggle-dust');
    const toggleRays = document.getElementById('toggle-rays');

    if (!settingsBtn) return;

    // Mở/Đóng panel
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPanel.classList.toggle('fx-hidden');
    });

    closeBtn.addEventListener('click', () => {
        settingsPanel.classList.add('fx-hidden');
    });

    // Đóng panel khi bấm ra ngoài
    document.addEventListener('click', (e) => {
        if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
            settingsPanel.classList.add('fx-hidden');
        }
    });

    // Lắng nghe thay đổi công tắc
    toggleDust.addEventListener('change', (e) => {
        window.fxSettings.dust = e.target.checked;
    });

    toggleRays.addEventListener('change', (e) => {
        window.fxSettings.rays = e.target.checked;
    });
});