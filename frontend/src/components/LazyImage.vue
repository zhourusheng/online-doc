<template>
  <div 
    class="lazy-image-container"
    :class="{ 'lazy-image-loaded': loaded, 'lazy-image-error': error }"
    :style="containerStyle"
  >
    <!-- 占位符或骨架屏 -->
    <div 
      v-if="!loaded && !error" 
      class="lazy-image-placeholder"
      :style="{ backgroundColor: placeholderColor }"
    >
      <div v-if="loading" class="lazy-image-spinner"></div>
    </div>
    
    <!-- 实际图片 -->
    <img
      v-show="loaded"
      ref="imageRef"
      :src="src"
      :alt="alt"
      class="lazy-image"
      @load="onImageLoaded"
      @error="onImageError"
    />
    
    <!-- 错误状态 -->
    <div v-if="error" class="lazy-image-error-content">
      <slot name="error">
        <span class="lazy-image-error-icon">!</span>
        <span>加载失败</span>
      </slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { getDominantColor, preloadImage, ImageLoadState, createLazyLoadObserver } from '../utils/image-loader';

export default defineComponent({
  name: 'LazyImage',
  props: {
    src: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    },
    width: {
      type: [Number, String],
      default: 'auto'
    },
    height: {
      type: [Number, String],
      default: 'auto'
    },
    placeholderColor: {
      type: String,
      default: '#f5f5f5'
    },
    threshold: {
      type: Number,
      default: 0.1
    },
    retryCount: {
      type: Number,
      default: 2
    }
  },
  setup(props, { emit }) {
    const imageRef = ref<HTMLImageElement | null>(null);
    const containerRef = ref<HTMLDivElement | null>(null);
    const loaded = ref(false);
    const loading = ref(false);
    const error = ref(false);
    const observer = ref<IntersectionObserver | null>(null);
    const dominantColor = ref(props.placeholderColor);

    const containerStyle = computed(() => {
      return {
        width: typeof props.width === 'number' ? `${props.width}px` : props.width,
        height: typeof props.height === 'number' ? `${props.height}px` : props.height,
      };
    });

    // 图片加载处理
    const loadImage = async () => {
      if (loaded.value || loading.value) return;
      
      loading.value = true;
      error.value = false;
      
      try {
        const result = await preloadImage(props.src, {
          retryCount: props.retryCount,
          retryDelay: 1000,
          timeout: 15000,
          onSuccess: () => {
            // 尝试获取主色调
            if (imageRef.value) {
              getDominantColor(imageRef.value).then(color => {
                dominantColor.value = color;
              }).catch(() => {
                // 忽略错误
              });
            }
          }
        });
        
        if (result === ImageLoadState.LOADED) {
          loaded.value = true;
          emit('load');
        } else {
          error.value = true;
          emit('error', new Error('Failed to load image'));
        }
      } catch (err) {
        error.value = true;
        emit('error', err);
      } finally {
        loading.value = false;
      }
    };

    // 图片加载完成回调
    const onImageLoaded = () => {
      loaded.value = true;
      loading.value = false;
      emit('load');
    };

    // 图片加载错误回调
    const onImageError = () => {
      error.value = true;
      loading.value = false;
      emit('error', new Error('Image load error'));
    };

    // 设置Intersection Observer
    onMounted(() => {
      if (!imageRef.value) return;
      
      observer.value = createLazyLoadObserver(imageRef.value, {
        threshold: props.threshold,
        onIntersect: loadImage
      });
    });

    // 清理
    onBeforeUnmount(() => {
      if (observer.value && imageRef.value) {
        observer.value.unobserve(imageRef.value);
        observer.value.disconnect();
      }
    });

    return {
      imageRef,
      containerRef,
      loaded,
      loading,
      error,
      dominantColor,
      containerStyle,
      onImageLoaded,
      onImageError
    };
  }
});
</script>

<style scoped>
.lazy-image-container {
  position: relative;
  overflow: hidden;
  background-color: var(--placeholder-color, #f5f5f5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lazy-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
}

.lazy-image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lazy-image-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.lazy-image-error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ff4d4f;
  font-size: 14px;
}

.lazy-image-error-icon {
  font-size: 24px;
  margin-bottom: 8px;
  border: 2px solid #ff4d4f;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 