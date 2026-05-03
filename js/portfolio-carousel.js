(function ($) {
    'use strict';

    var INTERVAL_MS = 6500;

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

        var count = $slides.length;
        if (!count || !$viewport.length) {
            return;
        }

        var index = 0;
        var autoplayTimer = null;
        var prefersReducedMotion =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        var $modal = $('#portfolioPhotoModal');
        var $lightboxImg = $('#portfolio-lightbox-img');

        var dragState = {
            active: false,
            pointerId: null,
            startX: 0,
            startScroll: 0,
            dragged: false
        };

        function scrollBehavior() {
            return prefersReducedMotion ? 'auto' : 'smooth';
        }

        function setActive(i) {
            index = ((i % count) + count) % count;
            $menuBtns.removeClass('is-active').removeAttr('aria-current');
            $menuBtns.eq(index).addClass('is-active').attr('aria-current', 'true');
            $copyLayers.removeClass('is-active');
            $copyLayers.eq(index).addClass('is-active');
        }

        function nearestIndexFromScroll() {
            var center = $viewport.scrollLeft() + $viewport.outerWidth() / 2;
            var bestIdx = 0;
            var bestDist = Infinity;
            $slides.each(function (idx) {
                var el = this;
                var mid = el.offsetLeft + el.offsetWidth / 2;
                var d = Math.abs(center - mid);
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = idx;
                }
            });
            return bestIdx;
        }

        function scrollToSlide(i, smooth) {
            var el = $slides.get(i);
            if (!el) {
                return;
            }
            var vpW = $viewport.outerWidth();
            var slideW = el.offsetWidth;
            var left = el.offsetLeft - (vpW - slideW) / 2;
            var max = Math.max(0, $track.outerWidth() - vpW);
            var target = Math.max(0, Math.min(left, max));
            $viewport[0].scrollTo({
                left: target,
                behavior: smooth === false || prefersReducedMotion ? 'auto' : scrollBehavior()
            });
            setActive(i);
        }

        var scrollSyncScheduled = false;
        function onViewportScroll() {
            if (scrollSyncScheduled) {
                return;
            }
            scrollSyncScheduled = true;
            window.requestAnimationFrame(function () {
                scrollSyncScheduled = false;
                var ni = nearestIndexFromScroll();
                if (ni !== index) {
                    setActive(ni);
                }
            });
        }

        function stopAutoplay() {
            if (autoplayTimer !== null) {
                clearInterval(autoplayTimer);
                autoplayTimer = null;
            }
        }

        function startAutoplay() {
            stopAutoplay();
            if (prefersReducedMotion || count <= 1) {
                return;
            }
            autoplayTimer = setInterval(function () {
                var next = (index + 1) % count;
                scrollToSlide(next, true);
            }, INTERVAL_MS);
        }

        function onDragPointerDown(e) {
            if (e.pointerType === 'mouse' && e.button !== 0) {
                return;
            }
            dragState.dragged = false;
            dragState.active = true;
            dragState.pointerId = e.pointerId;
            dragState.startX = e.clientX;
            dragState.startScroll = $viewport.scrollLeft();
            $viewport.addClass('is-dragging');
            stopAutoplay();
            try {
                e.currentTarget.setPointerCapture(e.pointerId);
            } catch (ignore) {}
        }

        function onDragPointerMove(e) {
            if (!dragState.active || e.pointerId !== dragState.pointerId) {
                return;
            }
            var dx = e.clientX - dragState.startX;
            if (Math.abs(dx) > 6) {
                dragState.dragged = true;
            }
            $viewport.scrollLeft(dragState.startScroll - dx);
        }

        function onDragPointerUp(e) {
            if (!dragState.active || e.pointerId !== dragState.pointerId) {
                return;
            }
            dragState.active = false;
            $viewport.removeClass('is-dragging');
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch (ignore) {}
            dragState.pointerId = null;
            startAutoplay();
        }

        $viewport.on('scroll', onViewportScroll);

        $viewport[0].addEventListener('pointerdown', onDragPointerDown);
        $viewport[0].addEventListener('pointermove', onDragPointerMove);
        $viewport[0].addEventListener('pointerup', onDragPointerUp);
        $viewport[0].addEventListener('pointercancel', onDragPointerUp);

        $menuBtns.on('click', function () {
            var i = parseInt($(this).attr('data-slide-index'), 10);
            if (!isNaN(i)) {
                scrollToSlide(i, true);
                stopAutoplay();
                startAutoplay();
            }
        });

        $viewport.on('keydown', function (e) {
            if (e.keyCode === 37) {
                scrollToSlide(index - 1, true);
                stopAutoplay();
                startAutoplay();
            } else if (e.keyCode === 39) {
                scrollToSlide(index + 1, true);
                stopAutoplay();
                startAutoplay();
            }
        });

        $viewport.on('mouseenter', stopAutoplay);
        $viewport.on('mouseleave', function () {
            if (!$modal.hasClass('in')) {
                startAutoplay();
            }
        });

        $slides.find('.portfolio-tricks-slide-hit').on('click', function (e) {
            if (dragState.dragged) {
                e.preventDefault();
                e.stopImmediatePropagation();
                dragState.dragged = false;
                return;
            }

            var $slide = $(this).closest('.portfolio-tricks-slide');
            var media = (($slide.attr('data-media') || '') + '').toLowerCase();
            var youtubeUrl = ($slide.attr('data-youtube-url') || '').trim();
            var imgSrc = ($slide.attr('data-image-src') || '').trim();
            var altZh = ($slide.attr('data-title-zh') || '').trim();
            var altEn = ($slide.attr('data-title-en') || '').trim();
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

        $modal.on('shown.bs.modal', stopAutoplay);

        $modal.on('hidden.bs.modal', function () {
            $lightboxImg.attr('src', '').attr('alt', '');
            startAutoplay();
        });

        $(window).on('resize', function () {
            scrollToSlide(index, false);
        });

        scrollToSlide(0, false);
        startAutoplay();
    }

    $(initPortfolioCarousel);
})(jQuery);
