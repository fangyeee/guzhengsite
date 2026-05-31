(function ($) {
    'use strict';

    var INTERVAL_MS = 5000;

    function initPortfolioCarousel() {
        var $layout = $('#portfolioCarousel');
        if (!$layout.length) {
            return;
        }

        var $viewport = $('#portfolioSliderViewport');
        var $track = $('#portfolioSliderTrack');
        var $slides = $track.children('.portfolio-tricks-slide');
        var $menuBtns = $('#portfolioTricksMenu').find('.portfolio-tricks-menu-item');
        var $copyLayers = $('#portfolioCopyStack').children('.portfolio-copy-layer');
        var $prevBtn = $layout.find('.portfolio-tricks-arrow-prev');
        var $nextBtn = $layout.find('.portfolio-tricks-arrow-next');

        var realCount = $menuBtns.length;
        if (!realCount || !$viewport.length || !$slides.length) {
            return;
        }

        var loop = realCount > 1;
        var index = 0;
        var autoplayTimer = null;
        var pendingJump = null;
        var resizeTimer = null;
        var prefersReducedMotion =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        var $modal = $('#portfolioPhotoModal');
        var $lightboxImg = $('#portfolio-lightbox-img');
        var $menuNav = $('#portfolioTricksMenu');

        function scrollMenuCompat(menu, pos) {
            var smooth = !prefersReducedMotion;
            var opts = { behavior: smooth ? 'smooth' : 'auto' };

            if (pos.top !== undefined) {
                opts.top = pos.top;
            }
            if (pos.left !== undefined) {
                opts.left = pos.left;
            }

            try {
                menu.scrollTo(opts);
            } catch (err) {
                if (pos.top !== undefined) {
                    menu.scrollTop = pos.top;
                }
                if (pos.left !== undefined) {
                    menu.scrollLeft = pos.left;
                }
            }
        }

        function scrollMenuToActive($activeMenu) {
            var menu = $menuNav[0];
            if (!menu || !$activeMenu.length) {
                return;
            }
            var item = $activeMenu[0];
            if (menu.scrollHeight > menu.clientHeight + 2) {
                var mr = menu.getBoundingClientRect();
                var ir = item.getBoundingClientRect();
                var delta =
                    ir.top + ir.height / 2 - (mr.top + mr.height / 2);
                var nextTop = menu.scrollTop + delta;
                var maxTop = Math.max(0, menu.scrollHeight - menu.clientHeight);
                scrollMenuCompat(menu, {
                    top: Math.max(0, Math.min(nextTop, maxTop))
                });
            } else if (menu.scrollWidth > menu.clientWidth + 2) {
                var mrx = menu.getBoundingClientRect();
                var irx = item.getBoundingClientRect();
                var deltaX =
                    irx.left + irx.width / 2 - (mrx.left + mrx.width / 2);
                var nextLeft = menu.scrollLeft + deltaX;
                var maxLeft = Math.max(0, menu.scrollWidth - menu.clientWidth);
                scrollMenuCompat(menu, {
                    left: Math.max(0, Math.min(nextLeft, maxLeft))
                });
            }
        }

        function domIndexForReal(r) {
            if (!loop) {
                return r;
            }
            return r + 1;
        }

        function setTrackTransform(tx, animate) {
            if (animate === false || prefersReducedMotion) {
                $track.css('transition', 'none');
            } else {
                $track.css('transition', 'transform 0.45s ease');
            }

            var rounded = Math.round(tx);
            var value = 'translate3d(' + rounded + 'px, 0, 0)';
            $track.css({
                transform: value,
                '-webkit-transform': value
            });
        }

        function centerDomSlide(domIdx, animate) {
            var slide = $slides.get(domIdx);
            var viewportEl = $viewport[0];
            if (!slide || !viewportEl) {
                return;
            }

            // clientWidth ignores scrollbar width — consistent on Mac vs Windows
            var viewportWidth = viewportEl.clientWidth;
            var slideWidth = slide.offsetWidth;
            var left = slide.offsetLeft - (viewportWidth - slideWidth) / 2;
            setTrackTransform(-left, animate);
        }

        function scheduleRecenter() {
            if (resizeTimer) {
                window.clearTimeout(resizeTimer);
            }
            resizeTimer = window.setTimeout(function () {
                resizeTimer = null;
                centerDomSlide(domIndexForReal(index), false);
            }, 50);
        }

        function setActive(realIdx) {
            index = ((realIdx % realCount) + realCount) % realCount;
            $slides.filter('[data-dom-role="real"]').removeClass('is-active');
            $slides.filter('[data-dom-role="real"][data-real-index="' + index + '"]').addClass('is-active');
            $menuBtns.removeClass('is-active').removeAttr('aria-current');
            var $activeMenu = $menuBtns.eq(index).addClass('is-active').attr('aria-current', 'true');
            $copyLayers.removeClass('is-active');
            $copyLayers.eq(index).addClass('is-active');
            scrollMenuToActive($activeMenu);
        }

        function goToReal(realIdx, animate) {
            pendingJump = null;
            var r = ((realIdx % realCount) + realCount) % realCount;
            setActive(r);
            centerDomSlide(domIndexForReal(r), animate);
        }

        function next() {
            if (!loop) {
                goToReal(0, true);
                return;
            }
            if (prefersReducedMotion) {
                goToReal(index + 1, false);
                return;
            }
            if (index === realCount - 1) {
                pendingJump = 'wrapToFirst';
                setActive(0);
                centerDomSlide(realCount + 1, true);
            } else {
                goToReal(index + 1, true);
            }
        }

        function prev() {
            if (!loop) {
                goToReal(0, true);
                return;
            }
            if (prefersReducedMotion) {
                goToReal(index - 1, false);
                return;
            }
            if (index === 0) {
                pendingJump = 'wrapToLast';
                setActive(realCount - 1);
                centerDomSlide(0, true);
            } else {
                goToReal(index - 1, true);
            }
        }

        function bindNavigation() {
            $menuBtns.on('click', function () {
                var i = parseInt($(this).attr('data-slide-index'), 10);
                if (!isNaN(i)) {
                    goToReal(i, true);
                    stopAutoplay();
                    startAutoplay();
                }
            });

            $prevBtn.on('click', function () {
                prev();
                stopAutoplay();
                startAutoplay();
            });

            $nextBtn.on('click', function () {
                next();
                stopAutoplay();
                startAutoplay();
            });
        }

        function bindSlideClicks() {
            $track.on('click', '.portfolio-tricks-slide-hit', function (e) {
                var $hit = $(this);
                var media = (($hit.attr('data-media') || '') + '').toLowerCase();
                var youtubeUrl = ($hit.attr('data-youtube-url') || '').trim();
                var imgSrc = ($hit.attr('data-image-src') || '').trim();
                var altZh = ($hit.attr('data-title-zh') || '').trim();
                var altEn = ($hit.attr('data-title-en') || '').trim();
                var alt = altZh || altEn;

                if (media === 'video' && youtubeUrl) {
                    e.preventDefault();
                    window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
                    return;
                }

                if (imgSrc) {
                    e.preventDefault();
                    $lightboxImg.attr('src', imgSrc).attr('alt', alt);
                    stopAutoplay();
                    $modal.modal('show');
                }
            });
        }

        function bindTrackTransitionEnd() {
            if (!loop || prefersReducedMotion) {
                return;
            }
            $track.on('transitionend webkitTransitionEnd', function (e) {
                if (e.target !== $track[0]) {
                    return;
                }
                var prop = e.originalEvent ? e.originalEvent.propertyName : e.propertyName;
                if (prop && prop !== 'transform') {
                    return;
                }
                if (pendingJump === 'wrapToFirst') {
                    pendingJump = null;
                    centerDomSlide(1, false);
                } else if (pendingJump === 'wrapToLast') {
                    pendingJump = null;
                    centerDomSlide(realCount, false);
                }
            });
        }

        function bindAutoplayPause() {
            $layout.on('mouseenter', stopAutoplay);
            $layout.on('mouseleave', function () {
                if (!$modal.hasClass('in')) {
                    startAutoplay();
                }
            });
        }

        function bindResize() {
            $(window).on('resize orientationchange', scheduleRecenter);

            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', scheduleRecenter);
                window.visualViewport.addEventListener('scroll', scheduleRecenter);
            }
        }

        function bindLanguageRecenter() {
            $(document.body).on('click', 'a[href*="switchLanguage"]', function () {
                window.setTimeout(function () {
                    centerDomSlide(domIndexForReal(index), false);
                }, 120);
            });
        }

        function bindFontsReady() {
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(function () {
                    centerDomSlide(domIndexForReal(index), false);
                });
            }
        }

        function stopAutoplay() {
            if (autoplayTimer !== null) {
                clearInterval(autoplayTimer);
                autoplayTimer = null;
            }
        }

        function startAutoplay() {
            stopAutoplay();
            if (prefersReducedMotion || realCount <= 1) {
                return;
            }
            autoplayTimer = setInterval(next, INTERVAL_MS);
        }

        $modal.on('shown.bs.modal', stopAutoplay);

        $modal.on('hidden.bs.modal', function () {
            $lightboxImg.attr('src', '').attr('alt', '');
            startAutoplay();
        });

        bindNavigation();
        bindSlideClicks();
        bindTrackTransitionEnd();
        bindAutoplayPause();
        bindResize();
        bindLanguageRecenter();
        bindFontsReady();
        setActive(0);
        centerDomSlide(domIndexForReal(0), false);
        startAutoplay();
    }

    $(initPortfolioCarousel);
})(jQuery);
